import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "redis";

export const maxDuration = 60;

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.STORAGE_URL ||
  process.env.KV_URL ||
  "";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// 高奢精品視覺字典庫
const CURATED_ASSETS = {
  // 咖啡視覺系列
  pourover_craft: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop", // 職人手沖滴漏
  original_americano: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1600&auto=format&fit=crop", // 經典俯瞰美式
  iced_americano: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=1600&auto=format&fit=crop", // 冰塊美式咖啡特寫
  latte_art: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop", // 精緻拉花
  cafe_space: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1600&auto=format&fit=crop", // 高奢咖啡空間裝潢
  // 棒球與運動系列
  baseball_night_stadium: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1600&auto=format&fit=crop",
  baseball_gear: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=1600&auto=format&fit=crop",
};

// 讀取對話記憶
async function getChatHistory(chatId: string): Promise<string> {
  if (!REDIS_URL) return "";
  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const raw = await client.get(`chat_memory_${chatId}`);
    await client.quit();
    if (!raw) return "";

    const list: Array<{ role: string; text: string }> = JSON.parse(raw);
    return list.map((item) => `${item.role === "user" ? "管理員" : "管家"}: ${item.text}`).join("\n");
  } catch (e) {
    return "";
  }
}

// 儲存對話記憶
async function appendChatHistory(chatId: string, userText: string, assistantReply: string) {
  if (!REDIS_URL) return;
  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const raw = await client.get(`chat_memory_${chatId}`);
    let list: Array<{ role: string; text: string }> = raw ? JSON.parse(raw) : [];

    list.push({ role: "user", text: userText });
    list.push({ role: "assistant", text: assistantReply });
    if (list.length > 8) list = list.slice(-8);

    await client.set(`chat_memory_${chatId}`, JSON.stringify(list));
    await client.quit();
  } catch (e) {}
}

// 即時被動回覆
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
  }).catch(() => {});
}

// 主動推播訊息與實機截圖
async function pushLineReport(to: string, text: string, imageUrl?: string | null) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !to) return;

  const messages: any[] = [{ type: "text", text }];
  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }

  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages }),
  }).catch(() => {});
}

// 雲端截圖（自適應寬螢幕與手機版）
async function captureWebsiteScreenshot(device: "mobile" | "desktop" = "mobile"): Promise<string | null> {
  try {
    const isDesktop = device === "desktop";
    const targetUrl = `https://sports-cafe-hub.vercel.app?preview_key=cafe888&t=${Date.now()}`;
    const width = isDesktop ? 1280 : 390;
    const height = isDesktop ? 800 : 844;

    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent(
      targetUrl
    )}&screenshot=true&viewport.isMobile=${isDesktop ? "false" : "true"}&viewport.width=${width}&viewport.height=${height}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(screenshotApi, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.screenshot?.url || null;
  } catch (err) {
    return null;
  }
}

// Gemini 1.5 Pro 高階管家大腦
async function processButlerIntelligence(userInstruction: string, chatHistory: string) {
  const prompt = `你現在是頂級品牌「Sport Café」的專屬智能品牌管家（具有如同資深特助、英爵管家般的專業涵養與前端美學意識）。
管理員通常透過 LINE 群組以非常自然口語交代各項視覺與功能調整。

你的職責是：
1. 深入理解管理員口語背後的真實審美意圖，不要機械式比對關鍵字。
2. 以「極具專業溫度、禮貌的專屬特助管家」口吻生成確認回覆。
3. 判定並輸出需要即時更新的 Live Config 參數（JSON）。

【最近對話紀錄】：
${chatHistory || "（暫無）"}

【可控制的 Live Config 視覺參數庫】：
- heroImage:
  * 職人手沖滴漏特寫（工藝感、另一種精品咖啡方式）: "${CURATED_ASSETS.pourover_craft}"
  * 原版經典美式咖啡（最初的白瓷杯俯瞰圖）: "${CURATED_ASSETS.original_americano}"
  * 質感冰美式特寫: "${CURATED_ASSETS.iced_americano}"
  * 高奢咖啡廳空間裝潢: "${CURATED_ASSETS.cafe_space}"
  * 棒球選手熱血打擊: "${CURATED_ASSETS.baseball_night_stadium}"
- bannerAnimation:
  * 上下跳動: "animate-bounce"
  * 呼吸閃爍: "animate-pulse"
  * 靜態無動效: "transform-none"
- btnStyle:
  * 香檳金色（電腦版或全站）: "bg-[#BA9868] hover:bg-[#a68455] md:bg-[#BA9868] md:hover:bg-[#a68455]"
  * LINE官方綠色: "bg-[#06C755] hover:bg-[#05b34c] md:bg-[#06C755] md:hover:bg-[#05b34c]"
  * 英爵酒紅色: "bg-[#7A1B28] hover:bg-[#63141f] md:bg-[#7A1B28] md:hover:bg-[#63141f]"
- announcement: 新的公告文字字串（若有提及）
- title: 新的品牌主標題（若有提及）

【管理員當前指令】：
"${userInstruction}"

請輸出嚴格的 JSON 格式（不要包含 markdown 標籤以外的雜訊）：
{
  "butlerReply": "例如：陳執行長您好，收到！已為您將首頁背景更換為職人手沖咖啡特寫，突顯深焙精品工藝感，稍後拍下最新畫面給您驗收。",
  "configUpdates": {
    "heroImage": "若有變動則填入對應圖片網址，無則不填",
    "bannerAnimation": "若有變動則填入動效class，無則不填",
    "btnStyle": "若有變動則填入色系class，無則不填",
    "announcement": "若有變動填入文字，無則不填",
    "title": "若有變動填入標題，無則不填"
  }
}`;

  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      }
    );

    const aiData = await aiRes.json();
    const rawJson = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(rawJson);
  } catch (err) {
    console.error("Gemini 1.5 Pro 運算失敗:", err);
    return null;
  }
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
      const targetChatId = (event.source as any).groupId || (event.source as any).roomId || userId;

      const isCallingBot =
        rawText.includes("@Sport Cafe") ||
        rawText.includes("@Sport") ||
        rawText.includes("管家") ||
        rawText.includes("助手") ||
        rawText.toLowerCase().includes("cafe");

      if (isGroupChat && !isCallingBot) continue;

      let cleanText = rawText
        .replace(/@Sport\s*Caf[eé]\s*(管理)?(助手|管家)?/gi, "")
        .replace(/@\S+\s*/g, "")
        .replace(/^[「『"“]|["”』」]$/g, "")
        .trim();

      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        if (!isGroupChat) await replyLine(replyToken, "抱歉，您尚未獲得管理員授權。");
        continue;
      }

      const isDesktopIntent =
        cleanText.includes("電腦") ||
        cleanText.includes("桌機") ||
        cleanText.includes("筆電") ||
        cleanText.includes("桌面");

      // 手動截圖查看
      const screenshotKeywords = ["截圖", "截取", "畫面", "看網站", "看首頁", "預覽"];
      if (screenshotKeywords.some((kw) => cleanText.includes(kw)) && !cleanText.includes("改") && !cleanText.includes("換") && !cleanText.includes("跳")) {
        const screenshot = await captureWebsiteScreenshot(isDesktopIntent ? "desktop" : "mobile");
        await pushLineReport(
          targetChatId,
          `【Sport Cafe 管家】\n為您呈上最新【${isDesktopIntent ? "電腦寬螢幕版" : "手機版"}】官網畫面：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 呼叫 Gemini 1.5 Pro 管家大腦
      const history = await getChatHistory(targetChatId);
      const plan = await processButlerIntelligence(cleanText, history);

      if (plan && plan.butlerReply) {
        // 1. 先用管家口吻即時回覆管理員
        await replyLine(replyToken, `【Sport Cafe 管家】\n${plan.butlerReply}`);

        // 2. 0.05 秒寫入 Redis Live Config（瞬間即時生效）
        if (REDIS_URL && plan.configUpdates) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();

          if (plan.configUpdates.heroImage) await client.set("site_hero_image", plan.configUpdates.heroImage);
          if (plan.configUpdates.bannerAnimation) await client.set("site_banner_animation", plan.configUpdates.bannerAnimation);
          if (plan.configUpdates.btnStyle) await client.set("site_btn_style", plan.configUpdates.btnStyle);
          if (plan.configUpdates.announcement) await client.set("site_announcement", plan.configUpdates.announcement);
          if (plan.configUpdates.title) await client.set("site_title", plan.configUpdates.title);

          await client.quit();
        }

        // 儲存對話記憶
        await appendChatHistory(targetChatId, cleanText, plan.butlerReply);

        // 3. 背景自動抓取截圖並回傳（官網已即時生效，只需等待 2 秒拍照）
        after(async () => {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          const screenshot = await captureWebsiteScreenshot(isDesktopIntent ? "desktop" : "mobile");

          await pushLineReport(
            targetChatId,
            `【Sport Cafe 管家】\n最新畫面已調整完成，實機截圖如下：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
        });

        continue;
      } else {
        await replyLine(replyToken, "【Sport Cafe 管家】\n抱歉，我剛才在理解您的指令時遇到一點小插曲，請您換個說法再交代一次。");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
