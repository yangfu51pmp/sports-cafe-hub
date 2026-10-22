import { NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL || "";

const defaultServices = [
  { title: "精品手沖咖啡", desc: "單品產地嚴選，日式手沖慢滴工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" },
  { title: "專業嚴選裝備", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop" },
  { title: "專業訓練課程", desc: "為運動員與品味人士特調的機能補給與訓練。", tag: "TRAINING", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop" },
  { title: "台日國際交流", desc: "結合仙台草野塾與台灣少棒的深度交流。", tag: "EXCHANGE", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop" },
];

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

        // 讀取現有服務項目，若無則用預設值
        const existingData = await client.get("site_services");
        let services = existingData ? JSON.parse(existingData) : defaultServices;

        let aiResponse = "收到！已為您調整完成。";

        // 2. 智慧解析「X 改成 Y」指令
        if (userText.includes("改成") || userText.includes("改成")) {
          // 簡單拆解指令格式：例如 "專業嚴選裝備 改成 職人嚴選裝備"
          const parts = userText.replace(/@.*?\s/, "").split(/改成|改成/);
          if (parts.length === 2) {
            const targetName = parts[0].trim();
            const newName = parts[1].trim();

            let found = false;
            services = services.map((item: any) => {
              if (item.title.includes(targetName) || targetName.includes(item.title)) {
                found = true;
                return { ...item, title: newName };
              }
              return item;
            });

            if (found) {
              await client.set("site_services", JSON.stringify(services));
              aiResponse = `【Sport Cafe 管家】已將「${targetName}」順利改為「${newName}」。`;
            } else {
              aiResponse = `【Sport Cafe 管家】找不到您指定的項目「${targetName}」，請確認名稱是否正確。`;
            }
          }
        }

        await client.quit();

        // 3. 產生極速截圖 URL
        const timestamp = Date.now();
        const screenshotUrl = `https://image.thum.io/get/maxAge/1/width/600/crop/800/https://sports-cafe-hub.vercel.app?t=${timestamp}`;

        // 4. 回傳精簡訊息與截圖
        if (process.env.LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          const messages: any[] = [
            {
              type: "text",
              text: aiResponse,
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
