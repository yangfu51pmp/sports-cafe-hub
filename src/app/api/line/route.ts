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

        // 2. 智慧解析服務項目修改指令
        if (userText.includes("專業裝備借測") || userText.includes("機能能量飲品") || userText.includes("新增")) {
          // 定義更新後的服務項目清單
          const updatedServices = [
            { title: "精品手沖咖啡", desc: "單品產地嚴選，日式手沖慢滴工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" },
            { title: "專業嚴選裝備", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop" },
            { title: "專業訓練課程", desc: "為運動員與品味人士特調的機能補給與訓練。", tag: "TRAINING", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop" },
            { title: "台日國際交流", desc: "結合仙台草野塾與台灣少棒的深度交流。", tag: "EXCHANGE", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop" },
          ];

          await client.set("site_services", JSON.stringify(updatedServices));
          aiResponse = "【Sport Cafe 管家】收到！已將服務項目更新為：\n1. 精品手沖咖啡\n2. 專業嚴選裝備\n3. 專業訓練課程\n4. 台日國際交流";
        } else if (userText.includes("金色") || userText.includes("純金")) {
          await client.set("site_btn_style", "bg-[#C8A878] text-white shadow-md");
          aiResponse = "【Sport Cafe 管家】收到！已將按鈕與標籤調整為高質感純金色。";
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
