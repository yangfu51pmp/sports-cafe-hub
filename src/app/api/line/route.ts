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
      const rawText = event.message.text.trim();
      const replyToken = event.replyToken;
      const isGroupChat = event.source.type === "group" || event.source.type === "room";

      // 1. 群組過濾：若是 @ 其他人（非機器人）的閒聊，機器人直接略過
      if (rawText.startsWith("@") && !rawText.includes("助手") && !rawText.includes("Sport") && !rawText.includes("cafe") && !rawText.includes("Caf")) {
        continue;
      }

      // 2. 清理輸入文字：自動去除 @機器人 標籤與引號
      let cleanText = rawText
        .replace(/@\S+\s*/g, "") // 消除所有 @標籤
        .replace(/^[「『"“]|["”』」]$/g, "")
        .trim();

      // 3. 白名單管理員驗證
      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        if (!isGroupChat) {
          await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        }
        continue;
      }

      // 4. 第一重保險：網址連結直接綁定（支援 YouTube 直播）
      const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
      if (urlMatch && (cleanText.includes("連結") || cleanText.includes("公告") || cleanText.includes("網址") || cleanText.includes("直播"))) {
        const targetUrl = urlMatch[0];
        if (REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement_url", targetUrl);
          await client.quit();

          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功將公告連結綁定為：\n${targetUrl}\n\n現在點擊官網頂部公告即可跳轉！\nhttps://sports-cafe-hub.vercel.app`
          );
          continue;
        }
      }

      // 5. 第一重保險：【標題修改】直接匹配（0 秒生效）
      if (cleanText.includes("標題") && (cleanText.includes("改為") || cleanText.includes("換成") || cleanText.includes("設定為") || cleanText.includes("加上"))) {
        let newTitle = cleanText.replace(/.*?(改為|換成|設定為|加上)[：:\s]*/, "").trim();
        if (newTitle && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_title", newTitle);
          await client.quit();

          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新網站主標題：\n「${newTitle}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`
          );
          continue;
        }
      }

      // 6. 第一重保險：【公告修改】直接匹配（0 秒生效）
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

      // 7. 第二重保險：Gemini 自然語言解析
      let parsedNotice: string | null = null;
      let parsedTitle: string | null = null;
      let parsedUrl: string | null = null;

      if (GEMINI_API_KEY && cleanText.length > 2) {
        try {
          const prompt = `你是一個網站後台管理助理。請判斷管理員輸入是否為修改網站內容的指令。
若是指令，請提取欄位並回傳 JSON；若純粹是用戶之間的日常聊天、非修改指令，請回傳 null。

欄位說明：
- announcement: 公告或活動文字 (若未提及則為 null)
- announcement_url: 網址連結 (若無則為 null)
- title: 網站大標題 (若未提及則為 null)

管理員輸入: "${cleanText}"

僅回傳純 JSON 格式（不要包含 markdown）：
{"announcement": null, "announcement_url": null, "title": "民安少棒贏球了！"}
若非指令請只回傳: null`;

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
          const rawAiText = (aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
          const cleanJson = rawAiText.replace(/```json/gi, "").replace(/```/g, "").trim();

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

      // 8. 寫入 Redis
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

      // 9. 僅在私聊時主動跳引導；在群組內若被 @ 且無法識別才回覆說明
      if (!isGroupChat || rawText.includes("Sport") || rawText.includes("助手")) {
        if (!isGroupChat) {
          await replyLine(
            replyToken,
            "【Sport Cafe 管理助手】\n已確認管理員身分！您可以交代我：\n\n• 標題改為：民安少棒贏球了！\n• 公告加入連結：https://...\n• 把公告改為：今日下午 2 點營業"
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("LINE webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
