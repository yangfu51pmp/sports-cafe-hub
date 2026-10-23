import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

// 雲端無人瀏覽器即時截圖（加入 force=true 避免舊快取）
async function captureWebsiteScreenshot(): Promise<string | null> {
  try {
    const targetUrl = `https://sports-cafe-hub.vercel.app?preview_key=cafe888&t=${Date.now()}`;
    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent(
      targetUrl
    )}&screenshot=true&viewport.isMobile=true&viewport.width=390&viewport.height=844&force=true`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);

    const res = await fetch(screenshotApi, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.screenshot?.url || null;
  } catch (err) {
    console.error("截圖產生失敗:", err);
    return null;
  }
}

// 彈性字串替換函式（支援精準替換、跨行替換、忽略中間 <br/> 標籤替換）
function applyFlexibleReplace(content: string, search: string, replace: string): { newContent: string; ok: boolean } {
  if (!search || !replace) return { newContent: content, ok: false };

  // 1. 直接精準替換
  if (content.includes(search)) {
    return { newContent: content.replaceAll(search, replace), ok: true };
  }

  // 2. 統一換行符替換
  const normC = content.replace(/\r\n/g, "\n");
  const normS = search.replace(/\r\n/g, "\n");
  const normR = replace.replace(/\r\n/g, "\n");

  if (normC.includes(normS)) {
    return { newContent: normC.replaceAll(normS, normR), ok: true };
  }

  // 3. 忽略多餘空白正則替換
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

  // 4. 忽略文字中間可能夾雜的 <br>、<br/> 或換行空白（解決標題斷行問題）
  try {
    const chars = Array.from(normS.trim()).map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const loosePattern = chars.join("(?:\\s|<br\\s*\\/?>)*");
    const looseReg = new RegExp(loosePattern, "g");
    if (looseReg.test(normC)) {
      return { newContent: normC.replace(looseReg, normR), ok: true };
    }
  } catch (e) {
    console.error("Loose regex error:", e);
  }

  return { newContent: content, ok: false };
}

// 呼叫 Gemini API（支援多模型自動容錯切換）
async function callGeminiJson(prompt: string): Promise<{ summary?: string; operations?: Array<{ search: string; replace: string }> }> {
  if (!GEMINI_API_KEY) return {};

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  for (const model of models) {
    try {
      const aiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
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

      if (!aiRes.ok) continue;

      const aiData = await aiRes.json();
      let rawJson = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!rawJson) continue;

      rawJson = rawJson.replace(/^```[a-zA-Z]*\n/m, "").replace(/\n```$/m, "").trim();
      const parsed = JSON.parse(rawJson);
      if (parsed && Array.isArray(parsed.operations) && parsed.operations.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error(`Model ${model} error:`, err);
    }
  }

  return {};
}

// GitHub 程式碼修改核心（結合 AI 語意定位 + 品牌色彩庫 + 直接文字替換備援）
async function modifyFrontendCode(userInstruction: string): Promise<{ success: boolean; message: string }> {
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

  // 1. 呼叫 Gemini 進行語意分析與局部定位（完整保留品牌色庫與規則）
  const prompt = `你是一位精通 Tailwind CSS 與 Next.js 的資深前端工程師。
以下是 Sport Café 官網首頁檔案：src/app/page.tsx。

【色彩庫與 Class 映射】：
- 香檳金 / 金色: bg-[#BA9868] hover:bg-[#a68455] (電腦版: md:bg-[#BA9868] md:hover:bg-[#a68455])
- LINE 綠色: bg-[#06C755] hover:bg-[#05b34c] (電腦版: md:bg-[#06C755] md:hover:bg-[#05b34c])
- 英爵酒紅: bg-[#7A1B28] hover:bg-[#63141f] (電腦版: md:bg-[#7A1B28] md:hover:bg-[#63141f])

【重要處理規則】：
1. 用戶常說「門市預約的兩個按鈕」，指的是門市體驗基地中的「LINE 台北預約」與「LINE 仙台交流」這兩顆按鈕。
2. 若指令提及「電腦版」，只修改帶有 "md:" 前綴的背景顏色樣式；不要更動手機版預設樣式。
3. 若指令要求修改標題或文字，請從程式碼中找出對應的原始文字（如預設標題或段落）放入 search，將新文字放入 replace。
4. 回傳嚴格的 JSON 格式：
{
  "summary": "修改摘要說明",
  "operations": [
    {
      "search": "要被替換的原始程式碼片段",
      "replace": "替換後的新程式碼片段"
    }
  ]
}
5. 嚴禁回傳空的 operations！必須大膽推斷並輸出最合理的修改方案。

【管理員指令】：
"${userInstruction}"

【目前首頁程式碼】：
${currentContent}`;

  const parsed = await callGeminiJson(prompt);

  // 2. 智慧備援機制（Fallback）：若 AI 未回傳或猶豫，由後台規則直接兜底
  if (!parsed.operations || parsed.operations.length === 0) {
    parsed.operations = [];
    const text = userInstruction.toLowerCase();

    // 情況 A：把「X」改成「Y」的引號精準替換
    const quoteMatch = userInstruction.match(/[「『"“]([^」』"”]+)[」』"”]\s*(?:改成|換成|改為|修改為)\s*[「『"“]([^」』"”]+)[」』"”]/);
    // 情況 B：X 改成 Y 的純文字替換（例如：專業嚴選裝備 改成 職人嚴選裝備）
    const plainMatch = userInstruction.match(/^(?:請|幫我|把網頁上的|把畫面上的|把)?(.+?)\s*(?:改成|換成|改為|修改為)[：:\s]*(.+)$/);

    if (quoteMatch) {
      const oldTxt = quoteMatch[1].trim();
      const newTxt = quoteMatch[2].trim();
      parsed.summary = `將「${oldTxt}」更新為「${newTxt}」`;
      parsed.operations.push({ search: oldTxt, replace: newTxt });
    } else if (text.includes("電腦") && (text.includes("金") || text.includes("香檳"))) {
      parsed.summary = "將電腦版門市預約按鈕調整為香檳金色";
      parsed.operations.push({
        search: "md:bg-[#06C755] md:hover:bg-[#05b34c]",
        replace: "md:bg-[#BA9868] md:hover:bg-[#a68455]",
      });
    } else if (text.includes("電腦") && (text.includes("綠") || text.includes("line"))) {
      parsed.summary = "將電腦版門市預約按鈕調整為 LINE 官方綠色";
      parsed.operations.push({
        search: "md:bg-[#BA9868] md:hover:bg-[#a68455]",
        replace: "md:bg-[#06C755] md:hover:bg-[#05b34c]",
      });
    } else if (plainMatch) {
      const oldTxt = plainMatch[1].replace(/^[「『"“]|["”』」]$/g, "").trim();
      const newTxt = plainMatch[2].replace(/^[「『"“]|["”』」]$/g, "").trim();
      // 若不是單純說「主標題」、「標題文字」，而是具體字詞，直接替換
      if (oldTxt && newTxt && !["主標題", "網頁主標題", "標題", "標題文字"].includes(oldTxt)) {
        parsed.summary = `將「${oldTxt}」更新為「${newTxt}」`;
        parsed.operations.push({ search: oldTxt, replace: newTxt });
      }
    }
  }

  if (!parsed.operations || parsed.operations.length === 0) {
    return {
      success: false,
      message: "AI 未能明確定位要修改的代碼，請嘗試指定原文字（例如：把「舊文字」改成「新文字」）。",
    };
  }

  // 3. 執行替換
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
    return { success: false, message: "在 page.tsx 中找不到對應的原始文字或樣式片段，請確認原文字是否正確。" };
  }

  // 4. 將代碼 Commit 回 GitHub
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

      // 1. 群組過濾：只有呼叫機器人時才動作
      const isCallingBot =
        rawText.includes("@Sport Cafe") ||
        rawText.includes("@Sport") ||
        rawText.includes("助手") ||
        rawText.toLowerCase().includes("cafe");

      if (isGroupChat && !isCallingBot) {
        continue;
      }

      // 2. 徹底清理輸入文字（完整移除 @Sport Cafe 管理助手 等前綴）
      const cleanText = rawText
        .replace(/@Sport\s*Cafe\s*(管理)?助手/gi, "")
        .replace(/@Sport\s*Cafe/gi, "")
        .replace(/@\S+\s*/g, "")
        .replace(/^(Sport\s*Cafe\s*)?(管理)?助手\s*/i, "")
        .replace(/^[「『"“]|["”』」]$/g, "")
        .trim();

      // 3. 管理員身分白名單驗證
      const allowedAdmins = LINE_ADMIN_USER_ID.split(",").map((id) => id.trim()).filter(Boolean);
      if (allowedAdmins.length > 0 && !allowedAdmins.includes(userId)) {
        if (!isGroupChat) {
          await replyLine(replyToken, "【Sport Cafe】抱歉，您尚未獲得管理員授權。");
        }
        continue;
      }

      // 4. 截圖指令
      const screenshotKeywords = ["截圖", "截取", "畫面", "看網站", "看首頁", "首頁圖", "預覽"];
      if (
        screenshotKeywords.some((kw) => cleanText.includes(kw)) &&
        !cleanText.includes("改") &&
        !cleanText.includes("換")
      ) {
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
      if (
        praiseKeywords.some((kw) => cleanText.includes(kw)) &&
        cleanText.length < 15 &&
        !cleanText.includes("改") &&
        !cleanText.includes("換") &&
        !cleanText.includes("http")
      ) {
        await replyLine(
          replyToken,
          "謝謝誇獎！我隨時在線待命，有任何門市公告、標題文字、排版樣式或按鈕顏色要調整，隨時 @ 我交代即可 😊⚾☕"
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
          try { revalidatePath("/"); } catch {}

          const screenshot = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功將公告連結綁定為：\n${targetUrl}\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 7. 門市公告修改（Redis 高速通道）
      if (cleanText.includes("公告改為") || cleanText.includes("公告換成") || cleanText.includes("公告改成")) {
        const directNotice = cleanText.replace(/.*?公告(改為|換成|改成)[：:\s]*/, "").trim();
        if (directNotice && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement", directNotice);
          await client.quit();
          try { revalidatePath("/"); } catch {}

          const screenshot = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新門市公告：\n「${directNotice}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 8. 網站主標題修改（雙重保障：先秒更 Redis，若需改動代碼亦同步處理）
      if (
        cleanText.includes("標題改為") ||
        cleanText.includes("標題換成") ||
        cleanText.includes("標題改成")
      ) {
        const newTitle = cleanText.replace(/.*?標題(改為|換成|改成)[：:\s]*/, "").trim();
        if (newTitle) {
          if (REDIS_URL) {
            const client = createClient({ url: REDIS_URL });
            await client.connect();
            await client.set("site_title", newTitle);
            await client.quit();
            try { revalidatePath("/"); } catch {}
          }

          // 同步請 AI/替換引擎檢查 page.tsx 是否有寫死的標題需一併替換
          if (GITHUB_TOKEN) {
            await modifyFrontendCode(`將首頁主標題（如「全國一起為民安少棒加油！」或目前 H1 標題文字）替換為「${newTitle}」`);
          }

          const screenshot = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新網站主標題：\n「${newTitle}」\n\n（若畫面為靜態代碼，Vercel 約需 20 秒完成部署，稍後可輸入「截圖」查看最新畫面）：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 9. 智慧代碼與文字修改核心（樣式、顏色、排版、按鈕、任意文字替換）
      const codeKeywords = ["改", "換", "修改", "標題", "顏色", "排版", "按鈕", "版面", "設計", "字體", "背景", "風格", "調整", "增加", "刪除", "電腦版", "手機版"];
      const isCodeModification = codeKeywords.some((kw) => cleanText.includes(kw));

      if (isCodeModification && GITHUB_TOKEN) {
        const result = await modifyFrontendCode(cleanText);

        if (result.success) {
          await replyLine(
            replyToken,
            `【Sport Cafe AI 工程師】🛠️\n已成功為您調整網站：${result.message}！\n\n⚡ 已自動推送到 GitHub，Vercel 正在部署中（約 20 秒）。完成後請 @ 我說「截圖」驗收！`
          );
          continue;
        } else {
          await replyLine(replyToken, `【Sport Cafe 管理助手】調整未完成：${result.message}`);
          continue;
        }
      }

      // 10. 一般引導回覆（當指令太模糊，如只輸入「我想改標題」時給予友善提示）
      await replyLine(
        replyToken,
        "【Sport Cafe 管理助手】\n您可以這樣交代我：\n\n• 標題改為：恭喜民安少棒奪勝！！\n• 公告改為：民安少棒・巨人盃賽事直播中！\n• 把「專業嚴選裝備」改成「職人嚴選裝備」\n• 把電腦版門市預約按鈕換成香檳金色\n• 截圖（查看目前畫面）"
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("LINE webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
