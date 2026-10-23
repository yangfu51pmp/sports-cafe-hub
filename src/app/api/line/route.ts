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
const GITHUB_OWNER = process.env.GITHUB_OWNER || "yangfu51pmp";
const GITHUB_REPO = process.env.GITHUB_REPO || "sports-cafe-hub";

// 提供給前端 page.tsx 即時讀取 Redis 標題、公告與連結的 GET 通道
export async function GET(req: NextRequest) {
  try {
    // 讀取網址參數讓 Next.js 自動判定為動態 API，無須額外設定 dynamic
    const _t = req.nextUrl.searchParams.get("t");

    if (!REDIS_URL) {
      return NextResponse.json({
        site_title: "",
        site_announcement: "",
        site_announcement_url: "",
        _t,
      });
    }
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const [site_title, site_announcement, site_announcement_url] = await Promise.all([
      client.get("site_title"),
      client.get("site_announcement"),
      client.get("site_announcement_url"),
    ]);
    await client.quit();

    return NextResponse.json(
      {
        site_title: site_title || "",
        site_announcement: site_announcement || "",
        site_announcement_url: site_announcement_url || "",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("GET Redis error:", error);
    return NextResponse.json({
      site_title: "",
      site_announcement: "",
      site_announcement_url: "",
    });
  }
}

// 支援傳送文字與截圖
async function replyLine(replyToken: string, text: string, imageUrl?: string | null) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// 雲端無人瀏覽器即時截圖（自動帶入 Redis 最新標題與公告，確保截圖 100% 零延遲）
async function captureWebsiteScreenshot(overrideTitle?: string, overrideNotice?: string): Promise<string | null> {
  try {
    let title = overrideTitle || "";
    let notice = overrideNotice || "";

    if ((!title || !notice) && REDIS_URL) {
      try {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        if (!title) title = (await client.get("site_title")) || "";
        if (!notice) notice = (await client.get("site_announcement")) || "";
        await client.quit();
      } catch (e) {
        console.error("Redis read for screenshot error:", e);
      }
    }

    const params = new URLSearchParams({
      preview_key: "cafe888",
      t: String(Date.now()),
    });
    if (title) params.set("live_title", title);
    if (notice) params.set("live_notice", notice);

    const targetUrl = `https://sports-cafe-hub.vercel.app?${params.toString()}`;
    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent(
      targetUrl
    )}&screenshot=true&viewport.isMobile=true&viewport.width=390&viewport.height=1650&force=true`;

    let data;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7500);
      const res = await fetch(screenshotApi, { signal: controller.signal, cache: "no-store" });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`First screenshot attempt failed with status: ${res.status}`);
      }
      data = await res.json();
    } catch (firstErr) {
      console.error("First screenshot attempt failed, retrying in 2 seconds...", firstErr);
      await new Promise(resolve => setTimeout(resolve, 2000));

      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), 7500);
      const res2 = await fetch(screenshotApi, { signal: controller2.signal, cache: "no-store" });
      clearTimeout(timer2);

      if (!res2.ok) {
        return null;
      }
      data = await res2.json();
    }

    return data?.data?.screenshot?.url || null;
  } catch (err) {
    console.error("截圖產生失敗:", err);
    return null;
  }
}

// 彈性字串替換函式
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

// 呼叫 Gemini API（支援多模型自動容錯切換）
async function callGeminiJson(prompt: string): Promise<{ summary?: string; operations?: Array<{ search: string; replace: string }> }> {
  if (!GEMINI_API_KEY) return {};

  const models = ["gemini-3.1-pro-preview", "gemini-3.1-pro", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];

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

// GitHub 程式碼修改核心（用於服務項目文字、顏色、版面調整）
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

  const prompt = `你是一位精通 Tailwind CSS 與 Next.js 的資深前端工程師。
以下是 Sport Café 官網首頁檔案：src/app/page.tsx。

【色彩庫與 Class 映射】：
- 純金 / 香檳金: bg-[#C8A878] hover:bg-[#B89868] 或 bg-[#BA9868] hover:bg-[#a68455]
- LINE 綠色: bg-[#06C755] hover:bg-[#05b34c]
- 英爵酒紅: bg-[#7A1B28] hover:bg-[#63141f]

【重要處理規則】：
1. 根據管理員指令，精準找出 page.tsx 中需要被替換的文字內容（例如 services 陣列裡的標題或描述）或 Tailwind CSS 樣式（例如 pureGoldStyle）。
2. 回傳嚴格的 JSON 格式：
{
  "summary": "修改摘要說明",
  "operations": [
    {
      "search": "要被替換的原始程式碼片段",
      "replace": "替換後的新程式碼片段"
    }
  ]
}
3. 嚴禁回傳空的 operations！

【管理員指令】：
"${userInstruction}"

【目前首頁程式碼】：
${currentContent}`;

  const parsed = await callGeminiJson(prompt);

  // 智慧備援機制（Fallback）：支援「把 A 改成 B」直接字串替換
  if (!parsed.operations || parsed.operations.length === 0) {
    parsed.operations = [];
    const quoteMatch = userInstruction.match(/[「『"“]([^」』"”]+)[」』"”]\s*(?:改成|換成|改為|修改為|替換為)\s*[「『"“]([^」』"”]+)[」』"”]/);
    const plainMatch = userInstruction.match(/^(?:請|幫我|把網頁上的|把畫面上的|把)?(.+?)\s*(?:改成|換成|改為|修改為|替換為)[：:\s]*(.+)$/);

    if (quoteMatch) {
      const oldTxt = quoteMatch[1].trim();
      const newTxt = quoteMatch[2].trim();
      parsed.summary = `將「${oldTxt}」更新為「${newTxt}」`;
      parsed.operations.push({ search: oldTxt, replace: newTxt });
    } else if (plainMatch) {
      const oldTxt = plainMatch[1].replace(/^[「『"“]|["”』」]$/g, "").trim();
      const newTxt = plainMatch[2].replace(/^[「『"“]|["”』」]$/g, "").trim();
      if (oldTxt && newTxt) {
        parsed.summary = `將「${oldTxt}」更新為「${newTxt}」`;
        parsed.operations.push({ search: oldTxt, replace: newTxt });
      }
    }
  }

  if (!parsed.operations || parsed.operations.length === 0) {
    return {
      success: false,
      message: "AI 未能明確定位要修改的代碼，請嘗試指定原文字（例如：把「專業嚴選裝備」改成「職人嚴選裝備」）。",
    };
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
    return { success: false, message: "在 page.tsx 中找不到對應的原始文字或樣式片段。" };
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

      // 1. 群組過濾
      const isCallingBot =
        rawText.includes("@Sport Cafe") ||
        rawText.includes("@Sport") ||
        rawText.includes("助手") ||
        rawText.toLowerCase().includes("cafe");

      if (isGroupChat && !isCallingBot) {
        continue;
      }

      // 2. 徹底清理輸入文字
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

      // 6. 網址綁定公告（Redis 高速通道，0.1 秒生效）
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

      // 7. 門市公告修改（Redis 高速通道，支援「公告改為...」、「把公告換成...」）
      const noticeMatch = cleanText.match(/公告(?:文字|內容)?(?:更改為?|修改為?|設定?為|改成|改為|換成)[：:\s]*(.+)/);
      if (noticeMatch && REDIS_URL) {
        const directNotice = noticeMatch[1].replace(/^[「『"“]|["”』」]$/g, "").trim();
        if (directNotice) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement", directNotice);
          await client.quit();
          try { revalidatePath("/"); } catch {}

          const screenshot = await captureWebsiteScreenshot(undefined, directNotice);
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新門市公告：\n「${directNotice}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 8. 網站主標題修改（Redis 高速通道，支援「標題改為...」、「把網頁主標題改成...」）
      const titleMatch = cleanText.match(/標題(?:文字|內容)?(?:更改為?|修改為?|設定?為|改成|改為|換成)[：:\s]*(.+)/);
      if (titleMatch && REDIS_URL) {
        const newTitle = titleMatch[1].replace(/^[「『"“]|["”』」]$/g, "").trim();
        if (newTitle) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_title", newTitle);
          await client.quit();
          try { revalidatePath("/"); } catch {}

          const screenshot = await captureWebsiteScreenshot(newTitle, undefined);
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新網站主標題：\n「${newTitle}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 9. 智慧代碼與文字修改核心（用於服務項目文字、顏色、版面調整）
      const codeKeywords = ["改", "換", "修改", "顏色", "排版", "按鈕", "版面", "設計", "字體", "背景", "風格", "調整", "增加", "刪除", "電腦版", "手機版"];
      const isCodeModification = codeKeywords.some((kw) => cleanText.includes(kw));

      if (isCodeModification && GITHUB_TOKEN) {
        const result = await modifyFrontendCode(cleanText);

        if (result.success) {
          await new Promise((resolve) => setTimeout(resolve, 20000));
          const newScreenshotUrl = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe AI 工程師】🛠️\n已成功為您調整網站代碼：${result.message}！\n\n⚡ 已自動推送到 GitHub 並完成部署，附上最新畫面！`,
            newScreenshotUrl
          );
          continue;
        } else {
          await replyLine(replyToken, `【Sport Cafe 管理助手】調整未完成：${result.message}`);
          continue;
        }
      }

      // 10. 一般引導回覆
      await replyLine(
        replyToken,
        "【Sport Cafe 管理助手】\n您可以這樣交代我：\n\n• 標題改為：因颱風影響全館休息。\n• 公告改為：民安少棒・巨人盃賽事直播中！\n• 把「專業嚴選裝備」改成「職人嚴選裝備」\n• 截圖（查看目前畫面）"
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("LINE webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
