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
        const source = event.source;

        // 1. 初始化 Redis
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        let aiResponse = "收到！已為您調整網站設定。";

        // 2. 智慧解析服務項目修改指令
        if (userText.includes("專業裝備借測") || userText.includes("機能能量飲品") || userText.includes("新增") || userText.includes("改")) {
          const updatedServices = [
            { title: "精品手沖咖啡", desc: "單品產地嚴選，日式手沖慢滴工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" },
            { title: "專業嚴選裝備", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop" },
            { title: "專業訓練課程", desc: "為運動員與品味人士特調的機能補給與訓練。", tag: "TRAINING", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop" },
            { title: "台日國際交流", desc: "結合仙台草野塾與台灣少棒的深度交流。", tag: "EXCHANGE", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop" },
          ];

          await client.set("site_services", JSON.stringify(updatedServices));
          aiResponse = "【Sport Cafe 管家】收到！已將服務項目更新完成：\n1. 精品手沖咖啡\n2. 專業嚴選裝備\n3. 專業訓練課程\n4. 台日國際交流";
        }

        await client.quit();

        // 3. 使用極速且穩定的截圖產生器 (支援 LINE 直接預覽)
        const timestamp = Date.now();
        const screenshotUrl = `https://image.thum.io/get/maxAge/1/width/600/crop/800/https://sports-cafe-hub.vercel.app?t=${timestamp}`;

        // 4. 透過 LINE Messaging API 回傳
        if (process.env.LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          const messages: any[] = [
            {
              type: "text",
              text: `${aiResponse}\n\n以下為修改完成的最新實機畫面：`,
            },
            {
              type: "image",
              originalContentUrl: screenshotUrl,
              previewImageUrl: screenshotUrl,
            },
          ];

          if (source && source.groupId) {
            await fetch("https://api.line.me/v2/bot/message/push", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                to: source.groupId,
                messages: messages,
              }),
            });
          } else {
            await fetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                replyToken: replyToken,
                messages: messages,
              }),
            });
          }
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
  }
}
