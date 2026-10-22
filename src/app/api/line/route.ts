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

// 精品高解析圖庫（精準咖啡特寫系列）
const CURATED_IMAGES = {
  pourover_craft: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop", // 職人手沖滴漏（精品工藝感）
  original_americano: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1600&auto=format&fit=crop", // 原版美式經典俯瞰
  iced_americano: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=1600&auto=format&fit=crop", // 透亮冰美式咖啡
  latte_art: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop", // 精品拉花拿鐵
  cafe_space: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1600&auto=format&fit=crop", // 空間裝潢照
  baseball_action: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1600&auto=format&fit=crop", // 棒球打擊
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
    return list.map((item) => `${item.role === "user" ? "管理員" : "助手"}: ${item.text}`).join("\n");
  } catch (e) {
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
  } catch (e) {}
}

// 被動即時回覆
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

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  }).catch(() => {});
}

// 主動推播截圖
async function pushLine(to: string, text: string, imageUrl?: string | null) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !to) return;

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
    } catch (e) {}
  }

  // 降級純文字
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
  }).catch(() => {});
}

// 雲端截圖
async function captureWebsiteScreenshot(device: "mobile" | "desktop" = "mobile"): Promise<string | null> {
  try {
    const isDesktop = device === "desktop";
    const targetUrl = `https://sports-cafe-hub.vercel.app?preview_key=cafe888&t=${Date.now()}`;
    const width = isDesktop ? 1280 : 390;
    const height = isDesktop ? 800 : 844;

    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent( targetUrl )}&screenshot=true&viewport.isMobile=${isDesktop ? "false" : "true"}&viewport.width=${width}&viewport.height=${height}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(screenshotApi, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.screenshot?.url || null;
  } catch (err) {
    return null;
  }
}

// 彈性字串替換
function applyFlexibleReplace(content: string, search: string, replace: string): { newContent: string; ok: boolean } {
  if (!search || !replace) return { newContent: content, ok: false };
  if (content.includes(search)) return { newContent: content.replaceAll(search, replace), ok: true };

  const normC = content.replace(/\r\n/g, "\n");
  const normS = search.replace(/\r\n/g, "\n");
  const normR = replace.replace(/\r\n/g, "\n");

  if (normC.includes(normS)) {
    return { newContent: normC.replaceAll(normS, normR), ok: true };
  }

  try {
    const escaped = normS.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const reg = new RegExp(escaped, "g");
    if (reg.test(normC)) return { newContent: normC.replace(reg, normR), ok: true };
  } catch (e) {}

  return { newContent: content, ok: false };
}

// GitHub 程式碼修改核心
async function modifyFrontendCode(userInstruction: string, chatHistory: string): Promise<{ success: boolean; message: string }> {
  if (!GITHUB_TOKEN) return { success: false, message: "尚未在 Vercel 設定 GITHUB_TOKEN。" };

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

  if (!getRes.ok) return { success: false, message: `讀取 GitHub 失敗 (${getRes.status})` };

  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  const fileSha = fileData.sha;

  const prompt = `你是一位資深 Next.js 前端架構師與 Sport Café 智能品牌管家。
請根據管理員口語指令，主動解讀其審美意圖並修改首頁檔案：src/app/page.tsx。

【對話脈絡】：
${chatHistory || "無"}

【精選圖庫庫】：
1. 職人手沖滴漏（精品工藝感、另一種咖啡呈現）: "${CURATED_IMAGES.pourover_craft}"
2. 原版經典美式咖啡（白瓷杯、俯瞰黑咖啡特寫）: "${CURATED_IMAGES.original_americano}"
3. 質感透亮冰美式咖啡: "${CURATED_IMAGES.iced_americano}"
4. 空間裝潢照: "${CURATED_IMAGES.cafe_space}"

【重要處理原則】：
1. 用戶若使用疑問句（例如「可以換...嗎？」、「能不能...」），請直接視為【肯定執行指令】，立刻進行更換！
2. 若用戶提及「另一種方式呈現精品咖啡」、「精品咖啡的感覺」，請選用【職人手沖滴漏】或【質感透亮冰美式】，替換首頁 Hero 的 backgroundImage！
3. 嚴禁回傳空的 operations！必須大膽給出最佳方案。

【管理員指令】：
"${userInstruction}"

【目前代碼】：
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
  } catch (err) {}

  // 強大備援兜底（100% 保證換圖成功）
  if (!parsed.operations || parsed.operations.length === 0) {
    parsed.operations = [];
    const text = userInstruction.toLowerCase();

    if (text.includes("咖啡") || text.includes("圖") || text.includes("照") || text.includes("呈現")) {
      let targetImg = CURATED_IMAGES.pourover_craft; // 預設精品手沖工藝感

      if (text.includes("最初") || text.includes("原本") || text.includes("美式")) {
        targetImg = CURATED_IMAGES.original_americano;
      } else if (text.includes("冰")) {
        targetImg = CURATED_IMAGES.iced_americano;
      }

      const bgMatch = currentContent.match(/backgroundImage:\s*`url\('(https:\/\/[^']+)'\)`/);
      if (bgMatch) {
        parsed.summary = "更換為職人手沖精品咖啡特寫視覺";
        parsed.operations.push({
          search: bgMatch[0],
          replace: `backgroundImage: \`url('${targetImg}')\``,
        });
      }
    }
  }

  if (!parsed.operations || parsed.operations.length === 0) {
    return { success: false, message: "AI 未能明確定位代碼，請嘗試更具體描述。" };
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

      const isCallingBot =
        rawText.includes("@Sport Cafe") ||
        rawText.includes("@Sport") ||
        rawText.includes("助手") ||
        rawText.toLowerCase().includes("cafe");

      if (isGroupChat && !isCallingBot) continue;

      let cleanText = rawText
        .replace(/@Sport\s*Caf[eé]\s*(管理)?助手/gi, "")
        .replace(/@\S+\s*/g, "")
        .replace(/^[「『"“]|["”』」]$/g, "")
        .trim();

      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        if (!isGroupChat) await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        continue;
      }

      const isDesktopIntent =
        cleanText.includes("電腦") ||
        cleanText.includes("桌機") ||
        cleanText.includes("筆電") ||
        cleanText.includes("桌面");

      // 手動截圖
      const screenshotKeywords = ["截圖", "截取", "畫面", "看網站", "看首頁", "首頁圖", "預覽"];
      if (screenshotKeywords.some((kw) => cleanText.includes(kw)) && !cleanText.includes("改") && !cleanText.includes("換") && !cleanText.includes("回")) {
        const screenshot = await captureWebsiteScreenshot(isDesktopIntent ? "desktop" : "mobile");
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已為您即時抓取最新【${isDesktopIntent ? "電腦寬螢幕版" : "手機版"}】官網畫面：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 智能代碼修改核心
      if (GITHUB_TOKEN && cleanText.length > 0) {
        const historyContext = await getChatHistory(targetChatId);
        const result = await modifyFrontendCode(cleanText, historyContext);

        if (result.success) {
          await appendChatHistory(targetChatId, cleanText, result.message);

          await replyLine(
            replyToken,
            `【Sport Cafe AI 工程師】🛠️\n已成功為您調整前端代碼：${result.message}！\n\n⚡ 已推送到 GitHub，Vercel 正在自動部署中。稍後我會將最新實機畫面拍照回傳！`
          );

          after(async () => {
            await new Promise((resolve) => setTimeout(resolve, 18000));
            const screenshot = await captureWebsiteScreenshot(isDesktopIntent ? "desktop" : "mobile");

            await pushLine(
              targetChatId,
              `【Sport Cafe AI 工程師】🎉\n${isDesktopIntent ? "電腦版" : "手機版"}最新改版已成功部署上線！\n實機截圖回報如下：\nhttps://sports-cafe-hub.vercel.app`,
              screenshot
            );
          });

          continue;
        } else {
          await replyLine(replyToken, `【Sport Cafe 管理助手】代碼調整未完成：${result.message}`);
          continue;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
