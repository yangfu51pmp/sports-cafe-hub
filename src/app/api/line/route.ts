import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

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

// 支援傳送文字與截圖
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
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });
}

// 雲端無人瀏覽器即時截圖
async function captureWebsiteScreenshot(): Promise<string | null> {
  try {
    const targetUrl = `https://sports-cafe-hub.vercel.app?preview_key=cafe888&t=${Date.now()}`;
    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent(
      targetUrl
    )}&screenshot=true&viewport.isMobile=true&viewport.width=390&viewport.height=844`;

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

// 彈性空格與正則替換函式（防範縮排與換行不一致）
function applyFlexibleReplace(content: string, search: string, replace: string): { newContent: string; ok: boolean } {
  // 1. 完全精確匹配
  if (content.includes(search)) {
    return { newContent: content.replaceAll(search, replace), ok: true };
  }

  // 2. 換行符統一匹配 (\r\n 與 \n)
  const normC = content.replace(/\r\n/g, "\n");
  const normS = search.replace(/\r\n/g, "\n");
  const normR = replace.replace(/\r\n/g, "\n");

  if (normC.includes(normS)) {
    return { newContent: normC.replaceAll(normS, normR), ok: true };
  }

  // 3. 忽略多餘空白與縮排的正則匹配
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

// GitHub 程式碼局部精準替換核心
async function modifyFrontendCode(userInstruction: string): Promise<{ success: boolean; message: string }> {
  if (!GITHUB_TOKEN) {
    return { success: false, message: "尚未在 Vercel 設定 GITHUB_TOKEN。" };
  }

  const filePath = "src/app/page.tsx";
  const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  // 1. 抓取 GitHub 最新 page.tsx
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

  // 2. 呼叫 Gemini AI（注入品牌專屬色彩與 RWD 字典）
  const prompt = `你是一位精通 Tailwind CSS 與 Next.js 的前端架構師。
以下是 Sport Café 首頁檔案：src/app/page.tsx。

【品牌色彩庫】：
- 香檳金（金色）：bg-[#BA9868] hover:bg-[#a68455]（電腦版：md:bg-[#BA9868] md:hover:bg-[#a68455]）
- LINE 官方綠：bg-[#06C755] hover:bg-[#05b34c]（電腦版：md:bg-[#06C755] md:hover:bg-[#05b34c]）
- 英爵酒紅：bg-[#7A1B28] hover:bg-[#63141f]（電腦版：md:bg-[#7A1B28] md:hover:bg-[#63141f]）
- 曜石黑：bg-stone-900 hover:bg-black

【重要規則】：
1. 響應式斷點：若指令提及「電腦版」，請專門修改帶有 "md:" 前綴的 class（例如把 "md:bg-[#06C755]" 改為 "md:bg-[#BA9868]"）；若提及「手機版」，則修改預設的 class。
2. 絕對不可回傳空的 operations！必須根據用戶語意，找出最符合的 1~2 段程式碼進行替換。
3. "search" 的字串請務必從下方【目前首頁程式碼】直接節選連續存在的 1~3 行代碼片段（不要太長，確保唯一即可）。

【管理員指令】：
"${userInstruction}"

【目前首頁程式碼】：
${currentContent}

請回傳 JSON 格式：
{
  "summary": "簡短摘要本次修改（例如：已將電腦版預約按鈕調整為香檳金色）",
  "operations": [
    {
      "search": "程式碼中實際存在的一小段片段",
      "replace": "替換後的代碼片段"
    }
  ]
}`;

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

  let parsed: { summary?: string; operations?: Array<{ search: string; replace: string }> };
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, message: "AI 解析指令格式失敗，請重試。" };
  }

  if (!parsed.operations || parsed.operations.length === 0) {
    return { success: false, message: "AI 未能定位到對應代碼，請嘗試換個說法。" };
  }

  // 3. 執行彈性局部替換
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

  // 4. 將修改後的代碼 Commit 回 GitHub
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
        .replace(/@\S+\s*/g, "")
        .replace(/^[「『"“]|["”』」]$/g, "")
        .trim();

      // 3. 身分白名單驗證
      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        if (!isGroupChat) {
          await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        }
        continue;
      }

      // 4. 截圖指令
      const screenshotKeywords = ["截圖", "截取", "畫面", "看網站", "看首頁", "首頁圖", "預覽"];
      if (screenshotKeywords.some((kw) => cleanText.includes(kw)) && !cleanText.includes("改") && !cleanText.includes("換")) {
        const screenshot = await captureWebsiteScreenshot();
        await replyLine(
          replyToken,
          "【Sport Cafe 管理助手】\n已為您即時抓取最新手機版官網畫面：\nhttps://sports-cafe-hub.vercel.app",
          screenshot
        );
        continue;
      }

      // 5. 稱讚與互動
      const praiseKeywords = ["很棒", "讚", "太棒", "辛苦", "謝謝", "感謝", "你好", "哈囉", "早安", "晚安", "厲害", "棒棒", "喜歡你"];
      if (praiseKeywords.some((kw) => cleanText.includes(kw)) && cleanText.length < 15 && !cleanText.includes("改") && !cleanText.includes("http")) {
        await replyLine(
          replyToken,
          "謝謝誇獎！我隨時在線待命，有任何門市公告、排版樣式或按鈕顏色要調整，隨時 @ 我交代即可 😊⚾☕"
        );
        continue;
      }

      // 6. 網址綁定公告（Redis 高速通道）
      const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
      if (urlMatch && (cleanText.includes("連結") || cleanText.includes("公告") || cleanText.includes("網址") || cleanText.includes("直播"))) {
        const targetUrl = urlMatch[0];
        if (REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement_url", targetUrl);
          await client.quit();

          const screenshot = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功將公告連結綁定為：\n${targetUrl}\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 7. 標題與公告修改（Redis 高速通道）
      if (cleanText.startsWith("標題改為") || cleanText.startsWith("標題換成")) {
        let newTitle = cleanText.replace(/^標題(改為|換成)[：:\s]*/, "").trim();
        if (newTitle && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_title", newTitle);
          await client.quit();

          const screenshot = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新網站主標題：\n「${newTitle}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      if (cleanText.startsWith("公告改為") || cleanText.startsWith("公告換成")) {
        let directNotice = cleanText.replace(/^公告(改為|換成)[：:\s]*/, "").trim();
        if (directNotice && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement", directNotice);
          await client.quit();

          const screenshot = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新門市公告：\n「${directNotice}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 8. 智能代碼修改核心（樣式、顏色、排版、按鈕調整）
      const codeKeywords = ["顏色", "排版", "按鈕", "版面", "設計", "字體", "背景", "風格", "換成", "調整", "增加", "刪除", "電腦版", "手機版"];
      const isCodeModification = codeKeywords.some((kw) => cleanText.includes(kw));

      if (isCodeModification && GITHUB_TOKEN) {
        const result = await modifyFrontendCode(cleanText);

        if (result.success) {
          await replyLine(
            replyToken,
            `【Sport Cafe AI 工程師】🛠️\n已成功為您調整前端代碼：${result.message}！\n\n⚡ 已自動推送到 GitHub，Vercel 正在部署中（約 20 秒）。稍後您可以 @ 我說「截圖」，我會立刻拍下最新畫面給您驗收！`
          );
          continue;
        } else {
          await replyLine(replyToken, `【Sport Cafe 管理助手】代碼調整未完成：${result.message}`);
          continue;
        }
      }

      // 9. 一般私聊引導
      if (!isGroupChat) {
        await replyLine(
          replyToken,
          "【Sport Cafe 管理助手】\n您可以交代我：\n\n• 電腦版的按鈕顏色調整為...\n• 標題改為：最新戰況\n• 截圖（查看目前畫面）"
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("LINE webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
