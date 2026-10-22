import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_OWNER = process.env.GITHUB_OWNER || "yangfu51pmp-8817";
const GITHUB_REPO = process.env.GITHUB_REPO || "sports-cafe-hub";

// 支援傳送 LINE 文字與圖片訊息
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
  });
}

// 雲端無人瀏覽器即時截圖
async function captureWebsiteScreenshot(): Promise<string | null> {
  try {
    const targetUrl = `https://sports-cafe-hub.vercel.app?preview_key=cafe888&t=${Date.now()}`;
    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&viewport.isMobile=true&viewport.width=390&viewport.height=844`;
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

// GitHub 程式碼自動修改與 Commit 核心函式
async function modifyFrontendCode(userInstruction: string): Promise<string> {
  if (!GITHUB_TOKEN) return "尚未在 Vercel 設定 GITHUB_TOKEN，無法自動修改代碼。";
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

  if (!getRes.ok) return `讀取 GitHub 檔案失敗 (狀態碼: ${getRes.status})`;

  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  const fileSha = fileData.sha;

  const prompt = `你是一位資深的 Next.js 與 Tailwind CSS 前端工程師。
這是一個名為 Sport Café 的精品咖啡與運動複合品牌首頁檔案：src/app/page.tsx。

【管理員的修改要求】：
"${userInstruction}"

【目前首頁的完整程式碼】：
${currentContent}

【修改任務】：
1. 嚴格根據管理員要求修改程式碼（例如文字替換、按鈕色彩、樣式、版面調整等）。
2. 保留原有完整的 Suspense、TypeScript interface、Redis 設定與響應式邏輯。
3. 務必保持 JSX 語法完全正確，不要缺少任何結束標籤。
4. 僅回傳修改後的「完整程式碼」，不要包含任何 markdown 解釋文字、不要包含 \`\`\`tsx 或 \`\`\` 區塊標籤。直接以 import 開頭輸出純文字代碼。`;

  const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const aiData = await aiRes.json();
  let updatedCode = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  updatedCode = updatedCode.replace(/^```[a-zA-Z]*\n/m, "").replace(/\n```$/m, "").trim();

  if (!updatedCode.startsWith("import")) return "AI 生成代碼格式有誤，已取消自動 Commit。";

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
      message: `[AI Bot Auto-Update] ${userInstruction.slice(0, 50)}`,
      content: Buffer.from(updatedCode, "utf-8").toString("base64"),
      sha: fileSha,
    }),
  });

  if (!putRes.ok) {
    const errData = await putRes.json();
    return `提交 GitHub 失敗: ${errData.message || putRes.statusText}`;
  }
  return "SUCCESS";
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

      // 1. 群組過濾：在群組內只有明確呼叫助手時才動作
      const isCallingBot = rawText.includes("@Sport Cafe") || rawText.includes("@Sport") || rawText.includes("助手") || rawText.toLowerCase().includes("cafe");
      if (isGroupChat && !isCallingBot) continue;

      // 2. 清理文字
      let cleanText = rawText.replace(/@\S+\s*/g, "").replace(/^[「『"“]|["”』」]$/g, "").trim();

      // 3. 管理員白名單驗證
      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim());
      if (LINE_ADMIN_USER_ID && !allowedAdmins.includes(userId)) {
        if (!isGroupChat) await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        continue;
      }

      // 4. 即時截圖指令
      const screenshotKeywords = ["截圖", "截取", "畫面", "看網站", "看首頁", "首頁圖", "預覽"];
      if (screenshotKeywords.some((kw) => cleanText.includes(kw)) && !cleanText.includes("改")) {
        const screenshot = await captureWebsiteScreenshot();
        await replyLine(replyToken, "【Sport Cafe 管理助手】\n已為您即時抓取最新手機版官網畫面：\nhttps://sports-cafe-hub.vercel.app", screenshot);
        continue;
      }

      // 5. 標題快速修改通道 (Redis)
      if (cleanText.includes("標題改為") || cleanText.includes("標題換成")) {
        let newTitle = cleanText.replace(/.*?標題(改為|換成)[：:\s]*/, "").trim();
        if (newTitle && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_title", newTitle);
          await client.quit();
          const screenshot = await captureWebsiteScreenshot();
          await replyLine(replyToken, `【Sport Cafe 管理助手】\n已成功更新主標題：「${newTitle}」`, screenshot);
          continue;
        }
      }

      // 6. 公告快速修改通道 (Redis)
      if (cleanText.includes("公告改為") || cleanText.includes("公告換成")) {
        let directNotice = cleanText.replace(/.*?公告(改為|換成)[：:\s]*/, "").trim();
        if (directNotice && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement", directNotice);
          await client.quit();
          const screenshot = await captureWebsiteScreenshot();
          await replyLine(replyToken, `【Sport Cafe 管理助手】\n已成功更新門市公告：「${directNotice}」`, screenshot);
          continue;
        }
      }

      // 7. 智慧 AI 前端代碼修改 (GitHub + Gemini)
      const modificationKeywords = ["改", "換", "顏色", "排版", "按鈕", "版面", "設計", "字體", "背景", "風格", "調整", "增加", "刪除"];
      if (modificationKeywords.some((kw) => cleanText.includes(kw)) && GITHUB_TOKEN) {
        const result = await modifyFrontendCode(cleanText);
        if (result === "SUCCESS") {
          await replyLine(replyToken, "【Sport Cafe AI 工程師】🛠️\n已成功調整代碼並推送到 GitHub！\n\n⚡ Vercel 正在自動建置（約 20 秒）。完成後請 @ 我說「截圖」驗收！");
          continue;
        } else {
          await replyLine(replyToken, `【Sport Cafe 管理助手】代碼調整未完成：${result}`);
          continue;
        }
      }

      // 8. 預設引導說明
      if (!isGroupChat) {
        await replyLine(replyToken, "【Sport Cafe 管理助手】\n您可以交代我：\n• 專業嚴選裝備 改成 職人嚴選裝備\n• 標題改為：民安少棒加油！！\n• 截圖");
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
