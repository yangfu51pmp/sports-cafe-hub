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

// GitHub 程式碼自動修改與 Commit 核心函式
async function modifyFrontendCode(userInstruction: string): Promise<string> {
  if (!GITHUB_TOKEN) {
    return "尚未在 Vercel 設定 GITHUB_TOKEN，無法自動修改代碼。";
  }

  const filePath = "src/app/page.tsx";
  const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  // 1. 抓取 GitHub 最新 page.tsx 檔案
  const getRes = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "SportCafe-Bot",
    },
    cache: "no-store",
  });

  if (!getRes.ok) {
    return `讀取 GitHub 檔案失敗 (狀態碼: ${getRes.status})，請確認權限與倉庫設定。`;
  }

  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  const fileSha = fileData.sha;

  // 2. 呼叫 Gemini AI 修改 React/Tailwind 程式碼
  const prompt = `你是一位資深的 Next.js 15 與 Tailwind CSS 前端工程師。
以下是 Sport Café 品牌的首頁檔案：src/app/page.tsx。

【管理員的修改要求】：
"${userInstruction}"

【目前首頁的完整程式碼】：
${currentContent}

【修改規則】：
1. 嚴格根據管理員的要求進行微調修改（例如調整顏色、樣式、排版或文字等）。
2. 必須完整保留原有的 Suspense、SiteConfig、defaultConfig、getLiveConfig() 與 Redis 邏輯。
3. 務必保持 JSX 語法完全正確，不要缺少任何閉合標籤。
4. 絕對不要有任何問候語、解釋文字或前後說明！第一行必須直接以 "import" 開頭！輸出整份完整的 TypeScript React 程式碼。`;

  const aiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  const aiData = await aiRes.json();
  let updatedCode = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // 強固過濾：去除 markdown 代碼區塊標記
  const codeBlockMatch = updatedCode.match(/```(?:tsx|typescript|jsx|js)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    updatedCode = codeBlockMatch[1];
  }

  // 強固過濾：自動消除 AI 可能產生的任何前置問候語，精準從第一個 import 開始抓取
  const importIndex = updatedCode.indexOf("import");
  if (importIndex !== -1) {
    updatedCode = updatedCode.slice(importIndex).trim();
  }

  // 安全防護驗證：確認程式碼具備完整 Next.js 頁面結構
  if (!updatedCode.startsWith("import") || !updatedCode.includes("export default function")) {
    return "AI 生成代碼格式有誤，已取消自動 Commit 以保護網站安全。";
  }

  // 3. 將修改後的代碼自動 Commit 回 GitHub main 分支
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

      // 1. 群組過濾：在群組內只有明確 @機器人 或叫助手時才動作
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

      // 3. 白名單身分驗證
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

      // 5. 稱讚與問候互動
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

      // 7. 純文字標題與公告修改（Redis 高速通道）
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

        if (result === "SUCCESS") {
          await replyLine(
            replyToken,
            `【Sport Cafe AI 工程師】🛠️\n已成功為您調整前端代碼並自動推送到 GitHub！\n\n⚡ Vercel 正在自動建置上線（約 20 秒）。稍後您可以 @ 我說「截圖」，我會立刻拍下最新畫面給您驗收！`
          );
          continue;
        } else {
          await replyLine(replyToken, `【Sport Cafe 管理助手】代碼調整未完成：${result}`);
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
