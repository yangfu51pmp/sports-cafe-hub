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

      // 1. 白名單身分比對（支援逗號隔開的多組 ID）
      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        continue;
      }

      // 2. 第一重保險：直接匹配關鍵字（免經 AI，速度最快、穩定度最高）
      const cleanText = userText.replace(/^[「『"“]|["”』」]$/g, "");
      if (cleanText.includes("公告") && (cleanText.includes("改為") || cleanText.includes("換成") || cleanText.includes("恢復成"))) {
        let newNotice = cleanText
          .replace(/.*?(改為|換成|恢復成)[：:\s]*/, "")
          .trim();
        if (cleanText.includes("恢復成歡迎光臨") || newNotice === "歡迎光臨") {
          newNotice = "歡迎光臨 Sport Café！手沖精品與專業運動裝備借測空間。";
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

      // 3. 第二重保險：透過原生 REST API 呼叫 Gemini AI（無須安裝任何套件）
      let parsedNotice: string | null = null;
      let parsedTitle: string | null = null;

      if (GEMINI_API_KEY) {
        try {
          const prompt = `你是一個網站後台管理助理。請根據管理員口語指令，提取要修改的欄位並回傳 JSON。
欄位說明：
- announcement: 公告文字 (若未提及則為 null)
- title: 網站主標題 (若未提及則為 null)

指令: "${userText}"

僅回傳純 JSON 格式，不要包含任何 markdown 或解說文字，例如:
{"announcement": "今日下午休館", "title": null}`;

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
          const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

          const parsed = JSON.parse(cleanJson);
          parsedNotice = parsed.announcement || null;
          parsedTitle = parsed.title || null;
        } catch (aiErr) {
          console.error("Gemini parse failed:", aiErr);
        }
      }

      // 4. 寫入 Redis
      if ((parsedNotice || parsedTitle) && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        let replyMsg = "【Sport Cafe 管理助手】更新成功：\n";
        if (parsedNotice) {
          await client.set("site_announcement", parsedNotice);
          replyMsg += `• 公告已改為：「${parsedNotice}」\n`;
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

      // 5. 無法辨識時的友善回覆
      await replyLine(
        replyToken,
        "【Sport Cafe 管理助手】\n已確認管理員身分！您可以直接用日常口語交代我：\n\n• 把公告改為：今日下午 2 點營業\n• 把公告恢復成歡迎光臨\n• 把標題加上（仙台交流店）"
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("LINE webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
