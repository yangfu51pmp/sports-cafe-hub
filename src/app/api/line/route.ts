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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_OWNER = process.env.GITHUB_OWNER || "yangfu51pmp-8817";
const GITHUB_REPO = process.env.GITHUB_REPO || "sports-cafe-hub";

// 精品高解析圖庫
const CURATED_IMAGES = {
  original_americano: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1600&auto=format&fit=crop",
  iced_americano: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=1600&auto=format&fit=crop",
  pourover_coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop",
  latte_art: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop",
  coffee_extraction: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1600&auto=format&fit=crop",
  japanese_cafe_bar: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop",
  luxury_cafe_space: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1600&auto=format&fit=crop",
  baseball_action: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1600&auto=format&fit=crop",
  baseball_gear: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=1600&auto=format&fit=crop",
};

// 讀取 Redis 對話記憶
async function getChatHistory(chatId: string): Promise<string> {
  if (!REDIS_URL) return "";
  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const raw = await client.get(`chat_memory_${chatId}`);
    await client.quit();
    if (!raw) return "";

    const list: Array<{ role: string; text: string }> = JSON.parse(raw);
    return list
      .map((item) => `${item.role === "user" ? "管理員" : "助手"}: ${item.text}`)
      .join("\n");
  } catch (e) {
    console.error("讀取記憶失敗:", e);
    return "";
  }
}

// 儲存對話記憶
async function appendChatHistory(chatId: string, userText: string, assistantSummary: string) {
  if (!REDIS_URL) return;
  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const raw = await client.get(`chat_memory_${chatId}`);
    let list: Array<{ role: string; text: string }> = raw ? JSON.parse(raw) : [];

    list.push({ role: "user", text: userText });
    list.push({ role: "assistant", text: assistantSummary });

    if (list.length > 10) list = list.slice(-10);

    await client.set(`chat_memory_${chatId}`, JSON.stringify(list));
    await client.quit();
  } catch (e) {
    console.error("儲存記憶失敗:", e);
  }
}

// 1. 即時被動回覆
async function replyLine(replyToken: string, text: string, imageUrl?: string | null) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return;

  const messages: any[] = [{ type: "text", text }];
  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }

  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });
  } catch (err) {
    console.error("LINE replyLine 失敗:", err);
  }
}

// 2. 主動推播訊息（具備圖片失敗自動降級純文字機制）
async function pushLine(to: string, text: string, imageUrl?: string | null) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !to) return;

  // 嘗試先送帶圖片的訊息
  if (imageUrl) {
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to,
          messages: [
            { type: "text", text },
            { type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl },
          ],
        }),
      });

      if (res.ok) return;
      console.warn("LINE 帶圖推播失敗，降級為純文字通知。狀態碼:", res.status);
    } catch (e) {
      console.error("LINE 帶圖推播例外:", e);
    }
  }

  // 降級機制：改送純文字訊息
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text }],
      }),
    });
  } catch (err) {
    console.error("LINE 純文字推播失敗:", err);
  }
}

// 3. 雲端截圖（帶短超時防卡死）
async function captureWebsiteScreenshot(device: "mobile" | "desktop" = "mobile"): Promise<string | null> {
  try {
    const isDesktop = device === "desktop";
    const targetUrl = `https://sports-cafe-hub.vercel.app?preview_key=cafe888&t=${Date.now()}`;
    const width = isDesktop ? 1280 : 390;
    const height = isDesktop ? 800 : 844;
    const isMobileParam = isDesktop ? "false" : "true";

    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent( targetUrl )}&screenshot=true&viewport.isMobile=${isMobileParam}&viewport.width=${width}&viewport.height=${height}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(screenshotApi, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.screenshot?.url || null;
  } catch (err) {
    console.error("截圖產生失敗:", err);
    return null;
  }
}

// 4. 彈性字串替換函式
function applyFlexibleReplace(content: string, search: string, replace: string): { newContent: string; ok: boolean } {
  if (!search || !replace) return { newContent: content, ok: false };

  if (content.includes(search)) {
    return { newContent: content.replaceAll(search, replace), ok: true };
  }

  const normC = content.replace(/\r\n/g, "\n");
  const normS = search.replace(/\r\n/g, "\n");
  const normR = replace.replace(/\r\n/g, "\n");

  if (normC.includes(normS)) {
    return { newContent: normC.replaceAll(normS, normR), ok: true };
  }

  try {
    const escaped = normS
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
    const reg = new RegExp(escaped, "g");
    if (reg.test(normC)) {
      return { newContent: normC.replace(reg, normR), ok: true };
    }
  } catch (e) {
    console.error("Regex replacement error:", e);
  }

  return { newContent: content, ok: false };
}

// 5. GitHub 程式碼修改核心
async function modifyFrontendCode(userInstruction: string, chatHistory: string): Promise<{ success: boolean; message: string }> {
  if (!GITHUB_TOKEN) {
    return { success: false, message: "尚未在 Vercel 設定 GITHUB_TOKEN。" };
  }

  const filePath = "src/app/page.tsx";
  const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "SportCafe-Bot",
    },
    cache: "no-store",
  });

  if (!getRes.ok) {
    return { success: false, message: `讀取 GitHub 失敗 (狀態碼: ${getRes.status})` };
  }

  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  const fileSha = fileData.sha;

  const customUrlMatch = userInstruction.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)[^\s"'<>]*|https:\/\/images\.unsplash\.com\/[^\s"'<>]+/i);

  const prompt = `你是一位精通 Tailwind CSS 與 Next.js 15 的資深前端架構師，也是 Sport Café 品牌的專屬智能管家。
你的工作是根據管理員的口語需求，精確解讀其意圖並調整首頁檔案：src/app/page.tsx。

【最近對話脈絡】：
${chatHistory || "（目前暫無近期對話紀錄）"}

【精選圖庫映射】：
- 最初原版經典美式咖啡（白瓷杯俯瞰特寫、細緻 Crema 黑咖啡）: "${CURATED_IMAGES.original_americano}"
- 質感冰美式咖啡（透明玻璃杯冰塊特寫，美式咖啡另一種經典形式）: "${CURATED_IMAGES.iced_americano}"
- 職人手沖黑咖啡滴落特寫: "${CURATED_IMAGES.pourover_coffee}"
- 精緻拿鐵拉花咖啡特寫: "${CURATED_IMAGES.latte_art}"
- 咖啡豆與萃取特寫: "${CURATED_IMAGES.coffee_extraction}"
- 日式極簡咖啡吧台空間照: "${CURATED_IMAGES.japanese_cafe_bar}"
- 高奢咖啡廳室內空間照: "${CURATED_IMAGES.luxury_cafe_space}"
- 棒球打擊 / 夜間球場: "${CURATED_IMAGES.baseball_action}"
- 棒球手套與紅線球特寫: "${CURATED_IMAGES.baseball_gear}"
${customUrlMatch ? `- 用戶指定自選圖片: "${customUrlMatch[0]}"` : ""}

【色彩庫映射】：
- 香檳金 / 金色: bg-[#BA9868] hover:bg-[#a68455] (電腦版: md:bg-[#BA9868] md:hover:bg-[#a68455])
- LINE 綠色: bg-[#06C755] hover:bg-[#05b34c] (電腦版: md:bg-[#06C755] md:hover:bg-[#05b34c])
- 英爵酒紅: bg-[#7A1B28] hover:bg-[#63141f] (電腦版: md:bg-[#7A1B28] md:hover:bg-[#63141f])

【核心意圖解析規則】：
1. 若管理員說「回到最初的圖」、「原本的圖」、「一杯美式咖啡」，請 100% 替換為【最初原版經典美式咖啡】。
2. 若管理員說「換個咖啡方式呈現」或「類似的圖換個呈現」，請選用【質感冰美式咖啡】或【職人手沖黑咖啡滴落特寫】等「杯裝咖啡特寫」，千萬不要選空間裝潢照！
3. 替換首頁背景圖：定位首頁 Hero 區塊的 backgroundImage 並替換為對應圖片網址。

【管理員當前指令】：
"${userInstruction}"

【目前首頁程式碼】：
${currentContent}`;

  let parsed: { summary?: string; operations?: Array<{ search: string; replace: string }> } = {};

  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );

    const aiData = await aiRes.json();
    const rawJson = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    parsed = JSON.parse(rawJson);
  } catch (err) {
    console.error("AI parse error:", err);
  }

  // 智慧備援兜底
  if (!parsed.operations || parsed.operations.length === 0) {
    const text = userInstruction.toLowerCase();
    parsed.operations = [];

    if (text.includes("最初") || text.includes("原本") || text.includes("美式") || text.includes("一杯") || text.includes("咖啡方式")) {
      const targetImg = text.includes("冰") || text.includes("另一") || text.includes("類似")
        ? CURATED_IMAGES.iced_americano
        : CURATED_IMAGES.original_americano;

      const bgMatch = currentContent.match(/backgroundImage:\s*`url\('(https:\/\/[^']+)'\)`/);
      if (bgMatch) {
        parsed.summary = "換回經典美式咖啡杯裝特寫視覺";
        parsed.operations.push({
          search: bgMatch[0],
          replace: `backgroundImage: \`url('${targetImg}')\``,
        });
      }
    }
  }

  if (!parsed.operations || parsed.operations.length === 0) {
    return { success: false, message: "AI 未能明確定位代碼，請嘗試更具體描述需求。" };
  }

  let updatedContent = currentContent;
  let appliedCount = 0;

  for (const op of parsed.operations) {
    if (!op.search || !op.replace) continue;
    const res = applyFlexibleReplace(updatedContent, op.search, op.replace);
    if (res.ok) {
      updatedContent = res.newContent;
      appliedCount++;
    }
  }

  if (appliedCount === 0) {
    return { success: false, message: "代碼片段匹配未命中，請稍後重試。" };
  }

  const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "SportCafe-Bot",
    },
    body: JSON.stringify({
      message: `[ChatOps] ${parsed.summary || userInstruction.slice(0, 40)}`,
      content: Buffer.from(updatedContent, "utf-8").toString("base64"),
      sha: fileSha,
    }),
  });

  if (!putRes.ok) {
    const errData = await putRes.json();
    return { success: false, message: `GitHub 提交失敗: ${errData.message || putRes.statusText}` };
  }

  return { success: true, message: parsed.summary || "代碼已成功更新" };
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

      // 1. 群組過濾
      const isCallingBot =
        rawText.includes("@Sport Cafe") ||
        rawText.includes("@Sport") ||
        rawText.includes("助手") ||
        rawText.toLowerCase().includes("cafe");

      if (isGroupChat && !isCallingBot) {
        continue;
      }

      // 2. 清理輸入文字
      let cleanText = rawText
        .replace(/@Sport\s*Caf[eé]\
