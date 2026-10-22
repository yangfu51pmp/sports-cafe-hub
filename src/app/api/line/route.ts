import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

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
      const isGroupChat = event.source.type === "group" || event.source.type === "room";

      // 1. 群組過濾：若是 @ 別人的閒聊訊息，機器人直接略過不處理
      if (userText.startsWith("@") && !userText.includes("助手") && !userText.includes("Sport")) {
        continue;
      }

      // 2. 白名單管理員驗證
      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        if (!isGroupChat) {
          await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        }
        continue;
      }

      // 3. 第一重保險：網址綁定（支援 YouTube 直播或任何連結）
      const urlMatch = userText.match(/https?:\/\/[^\s]+/i);
      const cleanText = userText.replace(/^[「『"“]|["”』」]$/g, "");

      if (urlMatch && (cleanText.includes("連結") || cleanText.includes("公告") || cleanText.includes("網址") || cleanText.includes("直播"))) {
        const targetUrl = urlMatch[0];

        if (REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement_url", targetUrl);
          await client.quit();

          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功將公告連結綁定為：\n${targetUrl}\n\n現在點擊官網頂部公告即可直接跳轉！\nhttps://sports-cafe-hub.vercel.app`
          );
          continue;
        }
      }

      // 4. 第一重保險：一般文字公告直接匹配
      let directNotice: string | null = null;
      if (cleanText.includes("公告") && (cleanText.includes("改為") || cleanText.includes("換成") || cleanText.includes("恢復成"))) {
        directNotice = cleanText.replace(/.*?(改為|換成|恢復成)[：:\s]*/, "").trim();
        if (cleanText.includes("恢復成歡迎光臨") || directNotice === "歡迎光臨") {
          directNotice = "歡迎光臨 Sport Café！手沖精品與專業運動裝備借測空間。";
        }
      } else if (cleanText.includes("營業時間") || cleanText.includes("店休") || cleanText.includes("公休")) {
        directNotice = cleanText;
      }

      if (directNotice && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.set("site_announcement", directNotice);
        await client.quit();

        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已成功更新門市公告：\n「${directNotice}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`
        );
        continue;
      }

      // 5. 第二重保險：透過原生 REST API 呼叫 Gemini AI
      let parsedNotice: string | null = null;
      let parsedTitle: string | null = null;
      let parsedUrl: string | null = null;

      if (GEMINI_API_KEY) {
        try {
          const prompt = `你是一個網站後台管理助理。請判斷用戶輸入是否為修改網站內容的指令。
若是指令，請提取欄位並回傳 JSON；若純粹是用戶之間的日常聊天、閒聊、對話或非指令，請回傳 null。

欄位說明：
- announcement: 公告或直播宣傳文字。若未提及則為 null。
- announcement_url: 包含的網址 (例如直播或活動連結)。若無則為 null。
- title: 首頁主標題。若未提及則為 null。

管理員輸入: "${userText}"

若是指令請僅回傳純 JSON 格式（不要有 markdown 標籤）：
{"announcement": "今日下午休館", "announcement_url": null, "title": null}
若不是修改指令，請只回傳: null`;

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
              }),
            }
          );

          const aiData = await res.json();
          const rawText = (aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
          const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

          if (cleanJson && cleanJson !== "null") {
            const parsed = JSON.parse(cleanJson);
            parsedNotice = parsed.announcement || null;
            parsedTitle = parsed.title || null;
            parsedUrl = parsed.announcement_url || null;
          }
        } catch (aiErr) {
          console.error("Gemini parse failed:", aiErr);
        }
      }

      // 寫入 Redis
      if ((parsedNotice || parsedTitle || parsedUrl) && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        let replyMsg = "【Sport Cafe 管理助手】更新成功：\n";
        if (parsedNotice) {
          await client.set("site_announcement", parsedNotice);
          replyMsg += `• 公告已改為：「${parsedNotice}」\n`;
        }
        if (parsedUrl) {
          await client.set("site_announcement_url", parsedUrl);
          replyMsg += `• 公告連結已設定為：${parsedUrl}\n`;
        }
        if (parsedTitle) {
          await client.set("site_title", parsedTitle);
          replyMsg += `• 標題已改為：「${parsedTitle}」\n`;
        }
        await client.quit();

        replyMsg += "\n官網已同步更新：\nhttps://sports-cafe-hub.vercel.app";
        await replyLine(replyToken, replyMsg);
        continue;
      }

      // 6. 防打擾機制：如果在群組內，未識別的閒聊對話保持完全安靜；只有 1 對 1 私聊時才主動提醒指令
      if (!isGroupChat) {
        await replyLine(
          replyToken,
          "【Sport Cafe 管理助手】\n已確認管理員身分！您可以交代我：\n\n• 公告加入連結：https://...\n• 把公告改為：今日下午 2 點營業\n• 把公告恢復成歡迎光臨"
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("LINE webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
