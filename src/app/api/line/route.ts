import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";
import { GoogleGenerativeAI } from "@google/generative-ai";

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.STORAGE_URL ||
  process.env.KV_URL ||
  "";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function replyLine(replyToken: string, text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return;
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const userId = event.source.userId;
      const userText = event.message.text.trim();
      const replyToken = event.replyToken;

      // 1. 白名單身分比對（支援逗號隔開的多組 ID）
      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        continue;
      }

      // 2. 備援規則（萬一無 API Key 或 AI 逾時，直接正規處理「把公告改為」）
      let cleanText = userText.replace(/^[「『"]|[」』"]$/g, "");
      if (cleanText.includes("公告") && (cleanText.includes("改為") || cleanText.includes("換成") || cleanText.includes("恢復成"))) {
        let newNotice = cleanText
          .replace(/.*?(改為|換成|恢復成)[：:\s]*/, "")
          .trim();
        if (cleanText.includes("恢復成歡迎光臨") || newNotice === "歡迎光臨") {
          newNotice = "歡迎光臨 Sport Café！手沖精品與專業運動裝備空間。";
        }

        if (newNotice && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement", newNotice);
          await client.quit();

          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新門市公告：\n「${newNotice}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`
          );
          continue;
        }
      }

      // 3. 使用 Gemini AI 進行多意圖語意解析
      if (!GEMINI_API_KEY) {
        await replyLine(
          replyToken,
          "【系統提醒】後台尚未設定 GEMINI_API_KEY，但您可以使用基本指令：\n「把公告改為：您的內容」"
        );
        continue;
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `你是一個網站內容管理助理。請根據用戶的管理指令，輸出 JSON 格式。
目前支援欄位：
- announcement (公告內容，字串)
- title (首頁標題，字串)

用戶訊息: "${userText}"

請僅回傳 JSON 格式，不要包含額外的說明文字或 Markdown 標籤，例如：
{"announcement": "今日正常營業", "title": null}`;

      const aiRes = await model.generateContent(prompt);
      const rawText = aiRes.response.text();
      // 清除可能包覆的 markdown 標籤
      const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

      let parsed: { announcement?: string | null; title?: string | null } = {};
      try {
        parsed = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.error("JSON parse failed:", rawText);
      }

      if (!parsed.announcement && !parsed.title) {
        await replyLine(
          replyToken,
          "【Sport Cafe 助手】未能識別您的修改內容，您可以直接說：\n• 「把公告改為：今日下午店休」\n• 「把標題加上（台北旗艦店）」"
        );
        continue;
      }

      // 寫入 Redis
      if (REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        let replyMsg = "【Sport Cafe 助手】更新成功：\n";
        if (parsed.announcement) {
          await client.set("site_announcement", parsed.announcement);
          replyMsg += `• 公告已改為：「${parsed.announcement}」\n`;
        }
        if (parsed.title) {
          await client.set("site_title", parsed.title);
          replyMsg += `• 標題已改為：「${parsed.title}」\n`;
        }
        await client.quit();

        replyMsg += "\n官網已即時更新：\nhttps://sports-cafe-hub.vercel.app";
        await replyLine(replyToken, replyMsg);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
