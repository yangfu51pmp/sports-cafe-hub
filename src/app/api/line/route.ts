import { NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userText = event.message.text;
        const replyToken = event.replyToken;

        // 1. 初始化 Redis
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        let aiResponse = "收到！已為您調整網站設定。";

        // 2. 智慧指令解析與 Redis 寫入
        if (userText.includes("金色") || userText.includes("漸層") || userText.includes("香檳金")) {
          await client.set("site_btn_style", "bg-gradient-to-r from-[#C8A878] via-[#BA9868] to-[#B08D5B] text-white shadow-md");
          aiResponse = "【Sport Cafe 管家】收到！已將按鈕調整為高質感香檳金色漸層。";
        } else if (userText.includes("跑馬燈")) {
          await client.set("site_banner_animation", "marquee-slide");
          aiResponse = "【Sport Cafe 管家】收到！已將公告欄調整為左右滑動跑馬燈。";
        } else if (userText.includes("標題")) {
          await client.set("site_title", "SPORT CAFÉ EXCLUSIVE");
          aiResponse = "【Sport Cafe 管家】收到！已更新首頁標題。";
        }

        await client.quit();

        // 3. 透過 LINE Messaging API 回覆訊息
        if (process.env.LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [
                {
                  type: "text",
                  text: `${aiResponse}\n\n最新設定已即時生效！`,
                },
              ],
            }),
          });
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
  }
}
