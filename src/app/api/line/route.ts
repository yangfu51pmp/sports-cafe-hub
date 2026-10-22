import { NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const defaultServices = [
  { title: "精品手沖咖啡", desc: "單品產地嚴選，日式手沖慢滴工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" },
  { title: "職人嚴選裝備", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop" },
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

        const existingServices = await client.get("site_services");
        let services = existingServices ? JSON.parse(existingServices) : defaultServices;

        let aiResponseText = "收到！已為您完成網站調整。";

        // 透過 Gemini REST API 進行高智能指令解析
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are the intelligent AI web concierge for "Sport Café".
Current services list: ${JSON.stringify(services)}

User instruction: "${userText}"

Analyze the instruction. If the user wants to rename a service item (e.g. "X 改成 Y"), update that item's title in the services array.
Return a valid JSON object ONLY (no markdown backticks) with keys:
- "updated": boolean (true if services were modified)
- "services": the full updated array of services (with title, desc, tag, img)
- "reply": short polite confirmation message in Traditional Chinese.`
                    }
                  ]
                }
              ]
            })
          });

          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const cleanJsonText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanJsonText);

          if (parsed.updated && Array.isArray(parsed.services)) {
            services = parsed.services;
            await client.set("site_services", JSON.stringify(services));
          }
          if (parsed.reply) {
            aiResponseText = `【Sport Cafe 智慧管家】${parsed.reply}`;
          }
        } catch (e) {
          // 降級防護：若 AI 解析發生例外，使用智慧關鍵字直接替換
          if (userText.includes("改成")) {
            const parts = userText.replace(/@\S+/g, "").replace(/管理助手/g, "").trim().split("改成");
            if (parts.length === 2) {
              const target = parts[0].trim();
              const replacement = parts[1].trim();
              services = services.map((s: any) => s.title.includes(target) ? { ...s, title: replacement } : s);
              await client.set("site_services", JSON.stringify(services));
              aiResponseText = `【Sport Cafe 智慧管家】已將項目更新為「${replacement}」。`;
            }
          }
        }

        await client.quit();

        // 產生即時實機截圖 URL
        const timestamp = Date.now();
        const screenshotUrl = `https://image.thum.io/get/width/600/crop/800/noanimate/wait/2000/https://sports-cafe-hub.vercel.app?t=${timestamp}`;

        if (process.env.LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          const messages: any[] = [
            { type: "text", text: aiResponseText },
            { type: "image", originalContentUrl: screenshotUrl, previewImageUrl: screenshotUrl },
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
