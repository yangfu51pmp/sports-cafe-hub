import { NextResponse } from "next/server";
import { createClient } from "redis";
import { GoogleGenAI } from "@google/genai";

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL || "";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

        // 2. 使用 Gemini 2.5 Pro 旗艦大腦解析指令與動態屬性
        let aiResponse = "收到！已為您調整網站設定。";
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `
              You are an AI web concierge for "Sport Café" (inspired by WBeauty).
              The user gave this instruction: "${userText}"
              
              Analyze if this instruction wants to change:
              1. site_title (string)
              2. site_announcement (string)
              3. site_announcement_url (string)
              4. site_hero_image (string url)
              5. site_btn_style (tailwind css class for buttons, e.g., if user wants champagne gold gradient, output: "bg-gradient-to-r from-[#C8A878] via-[#BA9868] to-[#B08D5B] text-white shadow-md")
              6. site_banner_animation (tailwind animation class)

              Return a strict JSON format with keys: action, key, value, replyMessage.
            `,
          });
          
          const rawText = response.text || "{}";
          // 嘗試解析 AI 回傳的 JSON
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.key && parsed.value) {
              await client.set(parsed.key, parsed.value);
            }
            if (parsed.replyMessage) {
              aiResponse = parsed.replyMessage;
            }
          }
        } catch (err) {
          // 簡易關鍵字備援：若提到金色漸層，直接寫入 Redis
          if (userText.includes("金色") || userText.includes("漸層") || userText.includes("香檳金")) {
            await client.set("site_btn_style", "bg-gradient-to-r from-[#C8A878] via-[#BA9868] to-[#B08D5B] text-white shadow-md");
            aiResponse = "【Sport Cafe 管家】收到！已將按鈕調整為高質感香檳金色漸層。";
          }
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
                  text: `【Sport Cafe 管家】\n${aiResponse}\n\n最新設定已即時生效！`,
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
