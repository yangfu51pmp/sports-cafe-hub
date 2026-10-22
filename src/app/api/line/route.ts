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

        const client = createClient({ url: REDIS_URL });
        await client.connect();

        const existingData = await client.get("site_services");
        let services = existingData ? JSON.parse(existingData) : defaultServices;

        let aiResponse = "收到！已為您調整完成。";

        // 精準解析「A 改成 B」指令
        if (userText.includes("改")) {
          // 清除提及標籤，萃取指令內容
          const cleanText = userText.replace(/@.*?\s/g, "").trim();
          const match = cleanText.match(/(.+?)\s*改成\s*(.+)/);

          if (match) {
            const targetName = match[1].trim();
            const newName = match[2].trim();

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
              aiResponse = `【Sport Cafe 管家】找不到「${targetName}」，目前項目有：${services.map((s:any)=>s.title).join("、")}`;
            }
          }
        }

        await client.quit();

        // 穩定支援 LINE 預覽的截圖 URL
        const timestamp = Date.now();
        const screenshotUrl = `https://image.thum.io/get/width/600/crop/800/noanimate/https://sports-cafe-hub.vercel.app?t=${timestamp}`;

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
              body: JSON.stringify({ to: source.groupId, messages }),
            });
          } else {
            await fetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({ replyToken, messages }),
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
