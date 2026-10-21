import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "redis";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const ADMIN_USER_IDS = (process.env.LINE_ADMIN_USER_ID || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.STORAGE_URL ||
  process.env.KV_URL ||
  "";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return true;
  const hash = crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

async function getRedis() {
  if (!REDIS_URL) return null;
  const client = createClient({ url: REDIS_URL });
  client.on("error", (err) => console.error("Redis Error:", err));
  await client.connect();
  return client;
}

// 透過 Gemini AI 理解自然口語並分析修改意圖
async function parseCommandWithAI(userText: string, currentNotice: string, currentTitle: string) {
  if (!GEMINI_API_KEY) return null;

  const prompt = `
你是一個專業的網站內容管理助手（Sport Cafe 運動咖啡空間）。
網站具備兩個動態文字欄位：
1. "announcement"（頂部橘色即時公告橫幅，目前內容為：「${currentNotice}」）
2. "title"（首頁形象主標題，目前內容為：「${currentTitle}」）

管理者傳送了一則訊息：
"""
${userText}
"""

請分析管理者的自然語言意圖，判斷是否要修改網站內容，並輸出合法 JSON 格式（不要包含任何 markdown 語法或多餘文字）：
{
  "is_admin_action": true 或 false（若是打招呼、提問、閒聊則設為 false）,
  "update_announcement": true 或 false,
  "new_announcement": "更新後的公告完整字串，若不變動請給 null",
  "update_title": true 或 false,
  "new_title": "更新後的主標題完整字串，若不變動請給 null",
  "summary_message": "給管理者的回覆確認說明（例如：首頁主標題已調整為「...」）"
}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    const json = await res.json();
    const resultText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) return null;
    return JSON.parse(resultText);
  } catch (e) {
    console.error("Gemini AI parse error:", e);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(rawBody);
    const events = data.events || [];

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userId = event.source.userId;
        const userText = event.message.text.trim();
        const replyToken = event.replyToken;

        // 白名單身分防護
        if (!ADMIN_USER_IDS.includes(userId)) {
          await sendLineReply(
            replyToken,
            `【Sport Cafe 管理通知】\n此帳號尚未取得編輯權限。\n如需共同管理，請將此 ID 提供給管理員加入白名單：\n\n${userId}`
          );
          continue;
        }

        const redis = await getRedis();
        let currentNotice = "歡迎光臨 Sport Cafe！";
        let currentTitle = "空間、咖啡與你的訓練日常";

        if (redis) {
          const n = await redis.get("site_announcement");
          const t = await redis.get("site_title");
          if (n) currentNotice = n;
          if (t) currentTitle = t;
        }

        // 1. 優先使用 AI 解析自然語言指令
        const aiParsed = await parseCommandWithAI(userText, currentNotice, currentTitle);

        if (aiParsed && aiParsed.is_admin_action) {
          if (redis) {
            if (aiParsed.update_announcement && aiParsed.new_announcement) {
              await redis.set("site_announcement", aiParsed.new_announcement);
            }
            if (aiParsed.update_title && aiParsed.new_title) {
              await redis.set("site_title", aiParsed.new_title);
            }
            await redis.quit();
          }

          await sendLineReply(
            replyToken,
            `【Sport Cafe 官網已同步更新】\n🤖 AI 已為您完成調整：\n${aiParsed.summary_message}\n\n點擊查看官網即時畫面：\nhttps://sports-cafe-hub.vercel.app`
          );
          continue;
        }

        // 2. 備用關鍵字機制
        if (userText.startsWith("更新公告")) {
          const content = userText.replace("更新公告", "").trim();
          if (redis) {
            await redis.set("site_announcement", content);
            await redis.quit();
          }
          await sendLineReply(
            replyToken,
            `【Sport Cafe 官網已同步更新】\n🎉 門市公告已更新為：\n「${content}」\n\n點擊查看官網即時畫面：\nhttps://sports-cafe-hub.vercel.app`
          );
        } else if (userText.startsWith("更新標題")) {
          const content = userText.replace("更新標題", "").trim();
          if (redis) {
            await redis.set("site_title", content);
            await redis.quit();
          }
          await sendLineReply(
            replyToken,
            `【Sport Cafe 官網已同步更新】\n🎉 首頁標題已變更為：\n「${content}」\n\n點擊查看官網即時畫面：\nhttps://sports-cafe-hub.vercel.app`
          );
        } else {
          if (redis) await redis.quit();
          await sendLineReply(
            replyToken,
            "【Sport Cafe 智慧助手】\n已確認您的管理身分！您可以直接用口語交代我：\n\n•「把標題加上（仙台店）」\n•「公告改為下週二台日棒球交流休館」\n•「把公告恢復成歡迎光臨」"
          );
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("LINE Webhook Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

async function sendLineReply(replyToken: string, text: string) {
  if (!CHANNEL_ACCESS_TOKEN || !replyToken) return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}
