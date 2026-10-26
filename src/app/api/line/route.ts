/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "redis";

export const maxDuration = 60;

// 智慧輪詢等待部署完成
async function waitForDeployment(expectedText?: string) {
  console.log("Waiting 15 seconds before first deployment check...");
  await new Promise(r => setTimeout(r, 15000));

  for (let i = 0; i < 7; i++) {
    try {
      const url = `https://sports-cafe-hub.vercel.app?_t=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();

      if (expectedText && html.includes(expectedText)) {
        console.log(`Deployment verified: found expected text "${expectedText}" on attempt ${i + 1}.`);
        return; // Found text, skip waiting
      }
      console.log(`Deployment check attempt ${i + 1} did not find expected text. Checking again in 3s...`);
    } catch (e) {
      console.error(`Deployment check error on attempt ${i + 1}:`, e);
    }

    // Wait 3 seconds before the next check
    if (i < 6) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.log("Finished waiting for deployment (max attempts reached).");
}

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.STORAGE_URL ||
  process.env.KV_URL ||
  "";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LINE_ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

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
        site_hero_image: "",
        _t,
      });
    }

    const client = createClient({ url: REDIS_URL });
    await client.connect();

    if (req.nextUrl.searchParams.get("hero_img") === "1") {
      const b64 = await client.get("site_hero_image_b64");
      const mime = await client.get("site_hero_image_mime") || "image/png";
      await client.quit();

      if (b64) {
        const buffer = Buffer.from(b64, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
      return new NextResponse("Not Found", { status: 404 });
    }

    if (req.nextUrl.searchParams.get("promo_poster") === "1") {
      const b64 = await client.get("site_promo_poster_b64");
      await client.quit();

      if (b64) {
        const buffer = Buffer.from(b64, "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
      return new NextResponse("Not Found", { status: 404 });
    }

    const [
      site_title, site_announcement, site_announcement_url, site_hero_image,
      site_promo_video, site_promo_video_title, site_promo_poster, site_promo_orientation, site_themes_json,
      site_ai_video_script, site_promo_video_draft, site_ai_video_script_draft
    ] = await Promise.all([
      client.get("site_title"),
      client.get("site_announcement"),
      client.get("site_announcement_url"),
      client.get("site_hero_image"),
      client.get("site_promo_video"),
      client.get("site_promo_video_title"),
      client.get("site_promo_poster"),
      client.get("site_promo_orientation"),
      client.get("site_themes_json"),
      client.get("site_ai_video_script"),
      client.get("site_promo_video_draft"),
      client.get("site_ai_video_script_draft"),
    ]);
    await client.quit();

    let site_themes = null;
    try {
      if (site_themes_json) site_themes = JSON.parse(site_themes_json);
    } catch {}

    return NextResponse.json(
      {
        site_title: site_title || "",
        site_announcement: site_announcement || "",
        site_announcement_url: site_announcement_url || "",
        site_hero_image: site_hero_image || "",
        site_promo_video: site_promo_video || "",
        site_promo_video_title: site_promo_video_title || "",
        site_promo_poster: site_promo_poster || "",
        site_promo_orientation: site_promo_orientation || "",
        site_themes: site_themes,
        site_ai_video_script: site_ai_video_script || null,
        site_promo_video_draft: site_promo_video_draft || "",
        site_ai_video_script_draft: site_ai_video_script_draft || null,
        _t,
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
      site_hero_image: "",
    });
  }
}

function getJpegOrientation(buffer: Buffer): "vertical" | "horizontal" {
  try {
    let i = 0;
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return "horizontal";
    }
    i += 2;
    while (i < buffer.length) {
      if (buffer[i] !== 0xFF) break;
      while (buffer[i] === 0xFF) i++; // skip padding 0xFF
      const marker = buffer[i];
      i++;

      // SOF0, SOF1, SOF2
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        const height = buffer.readUInt16BE(i + 3);
        const width = buffer.readUInt16BE(i + 5);
        return height > width ? "vertical" : "horizontal";
      } else {
        const length = buffer.readUInt16BE(i);
        i += length;
      }
    }
  } catch (e) {
    console.error("Failed to parse JPEG dimensions", e);
  }
  return "horizontal";
}

// 將中文轉換為英文商業攝影提示詞
async function translateToEnglishPrompt(chinesePrompt: string): Promise<string> {
  const prompt = `Translate the following user request into a precise English text-to-image prompt, optimized for a commercial photography style. Provide ONLY the translated English prompt, without any extra text or quotes: "${chinesePrompt}"`;
  const result = await callGeminiJson(prompt, true);
  if (result.translatedPrompt) {
    return result.translatedPrompt;
  }
  return chinesePrompt; // Fallback to original if AI fails
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
async function captureWebsiteScreenshot(overrideTitle?: string, overrideNotice?: string, overrideBg?: string, overrideVideo?: string, overrideVideoTitle?: string): Promise<string | null> {
  try {
    let title = overrideTitle || "";
    let notice = overrideNotice || "";
    let bg = overrideBg || "";
    let video = overrideVideo || "";
    let videoTitle = overrideVideoTitle || "";
    let poster = "";
    let orientation = "";

    if ((!title || !notice || !bg || !video || !videoTitle) && REDIS_URL) {
      try {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        if (!title) title = (await client.get("site_title")) || "";
        if (!notice) notice = (await client.get("site_announcement")) || "";
        if (!bg) bg = (await client.get("site_hero_image")) || "";
        if (!video) video = (await client.get("site_promo_video")) || "";
        if (!videoTitle) videoTitle = (await client.get("site_promo_video_title")) || "";
        poster = (await client.get("site_promo_poster")) || "";
        orientation = (await client.get("site_promo_orientation")) || "";
        await client.quit();
      } catch (e) {
        console.error("Redis read for screenshot error:", e);
      }
    }

    const params = new URLSearchParams({
      preview_key: "cafe888",
      screenshot: "1",
      t: String(Date.now()),
      cb: String(Date.now()),
    });
    if (title) params.set("live_title", title);
    if (notice) params.set("live_notice", notice);
    if (bg) params.set("live_bg", bg);
    if (video) params.set("live_video", video);
    if (videoTitle) params.set("live_video_title", videoTitle);
    if (poster) params.set("live_poster", poster);
    if (orientation) params.set("live_orientation", orientation);

    const targetUrl = `https://sports-cafe-hub.vercel.app?${params.toString()}`;
    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent(
      targetUrl
    )}&screenshot=true&viewport.isMobile=true&viewport.width=390&viewport.height=1950&force=true`;

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

// 呼叫 AI 生成影片腳本 (Dedicated Schema Validation)
async function callAiForVideoScript(prompt: string): Promise<any> {
  const models = [
    { name: "gemini-2.5-flash", provider: "gemini" },
    { name: "anthropic/claude-3.5-sonnet", provider: "openrouter" },
    { name: "gemini-2.0-flash", provider: "gemini" },
    { name: "openai/gpt-4o-mini", provider: "openrouter" },
    { name: "gemini-2.5-pro", provider: "gemini" }
  ];

  for (const model of models) {
    try {
      let aiRes = "";
      if (model.provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${GEMINI_API_KEY}`;
        const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } };
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) {
          const json = await res.json();
          aiRes = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } else {
        aiRes = await callOpenRouterString(prompt, [model.name]);
      }

      if (aiRes) {
        const match = aiRes.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          // Strict Validation
          if (parsed.cover && Array.isArray(parsed.subtitles) && parsed.subtitles.length > 0 && Array.isArray(parsed.events) && parsed.events.length > 0 && parsed.outro) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn(`callAiForVideoScript failed for model ${model.name}:`, e);
    }
  }
  return null;
}

async function generateAiVideoScript(topicPrompt: string, existingScript?: any, previewImageB64?: string): Promise<any> {
  const prompt = existingScript
    ? `根據使用者的修改指令："${topicPrompt}"，更新以下 JSON 物件。原始 JSON: ${typeof existingScript === 'string' ? existingScript : JSON.stringify(existingScript)}
請確保 100% 繁體中文，嚴禁出現英文句子 (如 MYTH BUSTED 等)。
確保結果完全符合以下 VideoScript TypeScript 介面:
{
  title?: string;
  cover: { journal?: string; date?: string; title: string; subtitle?: string; stamp?: string; speaker?: string; speakerRole?: string };
  subtitles: Array<{ start: number; end: number; text: string; highlight?: string; color?: string }>;
  events: Array<{ start: number; end: number; type: "qa_bubble"|"myth_buster"|"big_impact"|"target_focus"|"numbered_pill"|"icon_pill"|"warning_tape"|"progress_card"|"checklist_card"; title?: string; subtitle?: string; text?: string; badge?: string; icon?: string; number?: string; progress?: number; items?: string[]; position?: "top-left"|"top-right"|"center"|"bottom-left"|"bottom-right"; sfx: "none" }>;
  outro: { badge?: string; title: string; points: string[]; signature?: string; cta?: string };
}
嚴格回傳 JSON。`
    : `請產生一個短影音的腳本 JSON 物件，請確保 100% 繁體中文，嚴禁出現英文句子 (如 MYTH BUSTED 等)！
確保結果完全符合以下 VideoScript TypeScript 介面:
{
  title?: string;
  cover: { journal?: string; date?: string; title: string; subtitle?: string; stamp?: string; speaker?: string; speakerRole?: string };
  subtitles: Array<{ start: number; end: number; text: string; highlight?: string; color?: string }>;
  events: Array<{ start: number; end: number; type: "qa_bubble"|"myth_buster"|"big_impact"|"target_focus"|"numbered_pill"|"icon_pill"|"warning_tape"|"progress_card"|"checklist_card"; title?: string; subtitle?: string; text?: string; badge?: string; icon?: string; number?: string; progress?: number; items?: string[]; position?: "top-left"|"top-right"|"center"|"bottom-left"|"bottom-right"; sfx: "none" }>;
  outro: { badge?: string; title: string; points: string[]; signature?: string; cta?: string };
}
要求：
- cover 時間必須是 0.0s~3.2s
- subtitles 必須有 10 句完整的繁體中文逐句字幕，每句 12～18 字，並設定 3～5 字的重點詞 highlight 及顏色 (#FDE047 或 #38BDF8 或 #FF6B6B)
- events 必須有 6 張不重疊的繁體中文重點字卡，涵蓋各種 type，sfx 固定為 "none"。每張字卡都必須同時填寫 badge (4～6字)、title (8～12字) 與 subtitle/text (12～18字補充解析)
- outro 是最後 3.5 秒的總結卡，包含 3 大重點條列與 LINE 行動呼籲
主題 / 焦點: ${topicPrompt || "SPORT CAFÉ 品牌介紹"}
嚴格回傳 JSON。`;

  // callGemini for dynamic generation (no check operations)
  if (GEMINI_API_KEY) {
    const models = ["gemini-2.5-flash", "gemini-2.5-pro"];
    for (const model of models) {
      try {
        const body: any = {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7
          }
        };

        if (previewImageB64) {
          const mimeType = previewImageB64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
          const b64Data = previewImageB64.split(",")[1] || previewImageB64;
          body.contents[0].parts.unshift({
            inline_data: { mime_type: mimeType, data: b64Data }
          });
        }

        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }
        );

        if (aiRes.ok) {
          const data = await aiRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
             return JSON.parse(match[0]);
          }
        }
      } catch (e) {
        console.warn(`generateAiVideoScript failed for model ${model}:`, e);
      }
    }
  }

  // Fallback
  return {
    title: topicPrompt.slice(0, 18) || "SPORT CAFÉ 品牌介紹",
    cover: { journal: "SPORT CAFÉ 特刊", date: "2026", title: topicPrompt.slice(0, 18) || " SPORT CAFÉ 職人體驗", subtitle: "極致咖啡與球具", stamp: "職人嚴選", speaker: "SPORT CAFÉ", speakerRole: "專業團隊" },
    subtitles: [
      { start: 0, end: 2.5, text: "探索 SPORT CAFÉ 的魅力", highlight: "SPORT CAFÉ", color: "#FDE047" },
      { start: 2.8, end: 5.5, text: "品味極致的手沖工藝", highlight: "手沖工藝", color: "#38BDF8" },
      { start: 5.8, end: 8.5, text: "體驗頂級的職人球具", highlight: "職人球具", color: "#FF6B6B" },
      { start: 8.8, end: 11.5, text: "為您帶來雙重饗宴", highlight: "雙重饗宴", color: "#FDE047" },
      { start: 11.8, end: 14.5, text: "感受運動的無限熱情", highlight: "無限熱情", color: "#38BDF8" },
      { start: 14.8, end: 17.5, text: "最好的賽前機能補給", highlight: "機能補給", color: "#FF6B6B" },
      { start: 17.8, end: 20.5, text: "結合職人與少棒精神", highlight: "少棒精神", color: "#FDE047" },
      { start: 20.8, end: 23.5, text: "立即前來體驗吧！", highlight: "體驗", color: "#38BDF8" }
    ],
    events: [
      { start: 3.5, end: 6.5, type: "qa_bubble", title: "日式手沖?", text: "完美點滴萃取", position: "top-right", sfx: "none" },
      { start: 7.0, end: 10.0, type: "myth_buster", title: "裝備提升", text: "優質球具突破極限", position: "top-left", sfx: "none" },
      { start: 10.5, end: 13.5, type: "big_impact", title: "熱血應援", text: "支持台灣少棒", position: "bottom-right", sfx: "none" },
      { start: 14.0, end: 17.0, type: "target_focus", title: "專注訓練", text: "引進日本技術", position: "top-right", sfx: "none" },
      { start: 17.5, end: 20.5, type: "numbered_pill", number: "01", text: "專業評估", position: "bottom-left", sfx: "none" },
      { start: 21.0, end: 24.0, type: "checklist_card", title: "品牌特色", items: ["日本交流", "專業特訓", "機能飲品"], position: "center", sfx: "none" }
    ],
    outro: { badge: "SPORT CAFÉ", title: "職人手沖 × 少棒殿堂", points: ["嚴選莊園手沖", "日規實戰球具借測", "日本移地訓練窗口"], signature: "SPORT CAFÉ 團隊", cta: "點擊下方 LINE 預約" }
  };
}

// 呼叫 Gemini API（支援多模型自動容錯切換）
async function callGeminiJson(prompt: string, textOnly = false): Promise<{ summary?: string; operations?: Array<{ search: string; replace: string }>; translatedPrompt?: string; modelName?: string }> {
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
              responseMimeType: textOnly ? "text/plain" : "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      if (!aiRes.ok) continue;

      const aiData = await aiRes.json();
      const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!rawText) continue;

      if (textOnly) {
        return { translatedPrompt: rawText.trim(), modelName: model };
      }

      const rawJson = rawText.replace(/^```[a-zA-Z]*\n/m, "").replace(/\n```$/m, "").trim();
      const parsed = JSON.parse(rawJson);
      if (parsed && Array.isArray(parsed.operations) && parsed.operations.length > 0) {
        return { ...parsed, modelName: model };
      }
    } catch (err) {
      console.error(`Model ${model} error:`, err);
    }
  }

  return {};
}


// 呼叫 OpenRouter API

async function callOpenRouterString(prompt: string, models: string[]): Promise<string> {
  if (!OPENROUTER_API_KEY) return "";

  for (const model of models) {
    try {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!aiRes.ok) continue;

      const data = await aiRes.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      if (rawText) return rawText;
    } catch (e) {
      console.error("Error with model", model, e);
    }
  }
  return "";
}

async function callOpenRouterJson(prompt: string, models: string[]): Promise<{ summary?: string; operations?: Array<{ search: string; replace: string }>; translatedPrompt?: string; modelName?: string; error?: string }> {
  if (!OPENROUTER_API_KEY) return { error: "尚未設定 OPENROUTER_API_KEY" };

  const jsonPrompt = prompt + "\n\n請務必只回傳包含 'summary' 與 'operations' 陣列的 JSON 格式字串，不要包含任何其他說明文字。";
  let lastError = "";

  for (const model of models) {
    try {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: jsonPrompt }],
        }),
      });

      if (!aiRes.ok) {
        lastError = `API 請求失敗 (狀態碼: ${aiRes.status})`;
        console.error(`OpenRouter ${model} failed with status: ${aiRes.status}`);
        continue;
      }

      const aiData = await aiRes.json();
      const rawText = aiData?.choices?.[0]?.message?.content || "";
      if (!rawText) {
        lastError = "模型沒有回傳內容";
        continue;
      }

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        lastError = "回傳內容找不到 JSON 區塊";
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && Array.isArray(parsed.operations) && parsed.operations.length > 0) {
        return { ...parsed, modelName: model };
      } else {
        lastError = "回傳的 JSON 缺少 operations 或為空";
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`OpenRouter model ${model} error:`, err);
    }
  }

  return { error: `OpenRouter 呼叫失敗 (${lastError})` };
}

// GitHub 程式碼修改核心（用於服務項目文字、顏色、版面調整）
async function uploadVideoToGitHub(base64Content: string): Promise<boolean> {
  if (!GITHUB_TOKEN) {
    console.error("No GITHUB_TOKEN provided.");
    return false;
  }

  try {
    let sha = "";
    // 1. 取得 public 目錄檔案列表，尋找 promo.mp4 以取得 sha
    const listRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (listRes.ok) {
      const files = await listRes.json();
      const existingFile = files.find((f: { name: string; sha: string }) => f.name === "promo.mp4");
      if (existingFile) {
        sha = existingFile.sha;
      }
    }

    // 2. 上傳或覆蓋檔案
    const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/public/promo.mp4`;
    const putBody: { message: string; content: string; branch: string; sha?: string } = {
      message: "Update promo.mp4 via LINE bot",
      content: base64Content,
      branch: "main",
    };
    if (sha) {
      putBody.sha = sha;
    }

    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error("GitHub API upload failed:", errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("uploadVideoToGitHub error:", error);
    return false;
  }
}

async function modifyFrontendCode(userInstruction: string): Promise<{ success: boolean; message: string; modelName?: string; expectedText?: string }> {
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


  let parsed: { summary?: string; operations?: Array<{ search: string; replace: string }>; modelName?: string; error?: string } = {};

  // 判斷指令包含特定模型
  const claudeMatch = userInstruction.match(/用\s*claude/i);
  const gptMatch = userInstruction.match(/用\s*(?:chatgpt|openai|gpt)/i);
  const grokMatch = userInstruction.match(/用\s*grok/i);

  // 清除 "用XXX" 字樣
  const cleanInstruction = userInstruction
    .replace(/用\s*claude/ig, "")
    .replace(/用\s*(?:chatgpt|openai|gpt)/ig, "")
    .replace(/用\s*grok/ig, "")
    .trim();

  // 更新 prompt，使用清除後的 cleanInstruction
  const finalPrompt = prompt.replace(userInstruction, cleanInstruction);

  let openRouterError = "";

  if (claudeMatch) {
    parsed = await callOpenRouterJson(finalPrompt, ["anthropic/claude-3.7-sonnet", "anthropic/claude-3.5-sonnet", "openai/gpt-4o"]);
    if (parsed.error) openRouterError = parsed.error;
  } else if (gptMatch) {
    parsed = await callOpenRouterJson(finalPrompt, ["openai/gpt-4o", "openai/gpt-4o-mini"]);
    if (parsed.error) openRouterError = parsed.error;
  } else if (grokMatch) {
    parsed = await callOpenRouterJson(finalPrompt, ["x-ai/grok-3", "x-ai/grok-2-1212"]);
    if (parsed.error) openRouterError = parsed.error;
  } else {
    // 預設 Gemini -> 備援 Claude -> GPT-4o -> Grok
    parsed = await callGeminiJson(finalPrompt);
    if (!parsed.operations || parsed.operations.length === 0) {
      parsed = await callOpenRouterJson(finalPrompt, ["anthropic/claude-3.7-sonnet", "anthropic/claude-3.5-sonnet", "openai/gpt-4o"]);
      if (parsed.error) openRouterError = parsed.error;
    }
    if (!parsed.operations || parsed.operations.length === 0) {
      parsed = await callOpenRouterJson(finalPrompt, ["openai/gpt-4o", "openai/gpt-4o-mini"]);
      if (parsed.error) openRouterError = parsed.error;
    }
    if (!parsed.operations || parsed.operations.length === 0) {
      parsed = await callOpenRouterJson(finalPrompt, ["x-ai/grok-3", "x-ai/grok-2-1212"]);
      if (parsed.error) openRouterError = parsed.error;
    }
  }

  // AI 回傳若空，確保其結構存在
  if (!parsed.operations) {
    parsed.operations = [];
  }

  let updatedContent = currentContent;
  let appliedCount = 0;
  let expectedText = "";

  for (const op of parsed.operations) {
    if (!op.search || !op.replace) continue;
    const res = applyFlexibleReplace(updatedContent, op.search, op.replace);
    if (res.ok) {
      updatedContent = res.newContent;
      appliedCount++;
      if (!expectedText) {
        expectedText = op.replace;
      }
    }
  }

  // 強化「把 A 改成 B」精準替換保底機制
  if (appliedCount === 0) {
    const directMatch = cleanInstruction.match(/把[「『"']?([^」』"']+)[\」\』"']?\s*(?:改為|改成|換成|更改為|更改|修改為|修改)\s*[「『"']?([^」』"']+)[\」\』"']?/);
    if (directMatch) {
      const oldText = directMatch[1];
      const newText = directMatch[2];

      if (currentContent.includes(oldText)) {
        updatedContent = currentContent.replace(oldText, newText);
        appliedCount++;
        expectedText = newText;
        parsed.summary = `精準替換：「${oldText}」為「${newText}」`;
        parsed.modelName = parsed.modelName ? `${parsed.modelName} (Direct Replace)` : "Direct Replace";
      }
    }
  }

  if (appliedCount === 0) {
    let errorMsg = "在 page.tsx 中找不到對應的原始文字或樣式片段。";
    if (openRouterError) {
       errorMsg = `修改失敗，原因：${openRouterError}`;
    } else if (!parsed.operations || parsed.operations.length === 0) {
       errorMsg = "AI 未能明確定位要修改的代碼，請嘗試指定原文字（例如：把「專業嚴選裝備」改成「職人嚴選裝備」）。";
    }

    return { success: false, message: errorMsg };
  }

  // 修改前，先將修改前的 currentContent 寫入 Redis
  if (REDIS_URL) {
    try {
      const redisClient = createClient({ url: REDIS_URL });
      await redisClient.connect();
      await redisClient.set("site_page_prev_backup", currentContent);
      await redisClient.quit();
    } catch (e) {
      console.error("Backup to Redis failed before modifying code:", e);
    }
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

  return { success: true, message: parsed.summary || "代碼已成功更新", modelName: parsed.modelName, expectedText };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== "message" || (event.message.type !== "text" && event.message.type !== "image" && event.message.type !== "video")) continue;

      const userId = event.source.userId;
      const replyToken = event.replyToken;
      const isGroupChat = event.source.type === "group" || event.source.type === "room";

      // 處理上傳圖片事件
      if (event.message.type === "image") {
        if (REDIS_URL && LINE_CHANNEL_ACCESS_TOKEN) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          const awaitingUpload = await client.get("awaiting_bg_upload");

          if (awaitingUpload === "1") {
            try {
              const imageRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
                headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
              });

              if (imageRes.ok) {
                const arrayBuffer = await imageRes.arrayBuffer();
                const b64 = Buffer.from(arrayBuffer).toString("base64");
                const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

                await client.set("site_hero_image_b64", b64);
                await client.set("site_hero_image_mime", mimeType);

                // Get the current base URL for the background
                const siteUrl = req.nextUrl.origin;
                const newBgUrl = `${siteUrl}/api/line?hero_img=1&t=${Date.now()}`;

                await client.set("site_hero_image", newBgUrl);
                await client.del("awaiting_bg_upload");
                await client.quit();

                try { revalidatePath("/"); } catch {}

                await new Promise((resolve) => setTimeout(resolve, 20000));
                const screenshot = await captureWebsiteScreenshot(undefined, undefined, newBgUrl);
                await replyLine(
                  replyToken,
                  `已將您傳送的照片設為官網背景！`,
                  screenshot
                );
                continue;
              }
            } catch (err) {
              console.error("Failed to process image upload:", err);
            }
          }
          await client.quit();
        }
        continue;
      }

      // 處理上傳影片事件
      if (event.message.type === "video") {
        if (REDIS_URL && LINE_CHANNEL_ACCESS_TOKEN) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          const awaitingVideoUpload = await client.get("awaiting_video_upload");

          if (awaitingVideoUpload === "1") {
            // 立即刪除以防重複處理
            await client.del("awaiting_video_upload");

            try {
              const videoRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content`, {
                headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
              });

              if (videoRes.ok) {
                const arrayBuffer = await videoRes.arrayBuffer();
                const b64 = Buffer.from(arrayBuffer).toString("base64");

                const uploadSuccess = await uploadVideoToGitHub(b64);

                if (uploadSuccess) {
                  const siteUrl = req.nextUrl.origin;
                  const newVideoUrl = `${siteUrl}/promo.mp4?v=${Date.now()}`;

                  await client.set("site_promo_video_draft", newVideoUrl);

                  // Fetch and save video thumbnail
                  try {
                    const previewRes = await fetch(`https://api-data.line.me/v2/bot/message/${event.message.id}/content/preview`, {
                      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` }
                    });
                    if (previewRes.ok) {
                      const previewBuffer = await previewRes.arrayBuffer();
                      const bufferObj = Buffer.from(previewBuffer);
                      const orientation = getJpegOrientation(bufferObj);
                      const previewB64 = bufferObj.toString("base64");
                      await client.set("site_promo_poster_b64", previewB64);
                      const posterUrl = `${siteUrl}/api/line?promo_poster=1&t=${Date.now()}`;
                      await client.set("site_promo_poster", posterUrl);
                      await client.set("site_promo_orientation", orientation);
                    }
                  } catch (e) {
                    console.error("Failed to fetch video preview:", e);
                  }

                  // Auto-generate script if not exists
                  const existingScript = await client.get("site_ai_video_script_draft");
                  if (!existingScript) {
                     const prompt = `Generate a JSON object for a short sports promotional video script that conforms EXACTLY to this VideoScript TypeScript interface:
                     {
                       title?: string;
                       cover?: { journal?: string; date?: string; title: string; subtitle?: string; stamp?: string; speaker?: string; speakerRole?: string };
                       subtitles?: Array<{ start: number; end: number; text: string; highlight?: string; color?: string }>;
                       events?: Array<{ start: number; end: number; type: "qa_bubble" | "myth_buster" | "big_impact" | "target_focus" | "numbered_pill" | "icon_pill" | "warning_tape" | "progress_card" | "checklist_card"; title?: string; subtitle?: string; text?: string; badge?: string; icon?: string; number?: string; progress?: number; items?: string[]; position?: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right"; sfx?: "none" }>;
                       outro?: { badge?: string; title: string; points: string[]; signature?: string; cta?: string };
                     }
                     Theme: SPORT CAFÉ 職人精神 × 少棒熱血應援
                     Output only valid JSON, no markdown formatting.`;

                     try {
                       const aiRes = await callOpenRouterString(prompt, ["anthropic/claude-3.7-sonnet", "anthropic/claude-3.5-sonnet", "openai/gpt-4o"]);
                       if (aiRes) {
                         const match = aiRes.match(/\{[\s\S]*\}/);
                         if (match) {
                           await client.set("site_ai_video_script_draft", match[0]);
                         }
                       }
                     } catch(e) {}
                  }

                  await client.quit();

                  try { revalidatePath("/"); } catch {}

                  await replyLine(
                    replyToken,
                    `✅ 已成功接收您的影片並推送至內部審片室！請點擊下方連結預覽審片：\n${siteUrl}/?preview=video\n\n（若需確認上架，請回覆「確認上架影片」）`
                  );
                  continue;
                } else {
                  await client.quit();
                  await replyLine(replyToken, "影片檔案可能過大導致上傳失敗，建議您可以改貼 YouTube / Shorts 連結。");
                  continue;
                }
              }
            } catch (err) {
              console.error("Failed to process video upload:", err);
            }
          }
          await client.quit();
        }
        continue;
      }

      const rawText = event.message.text.trim();

      // 1. 群組過濾
      const isCallingBot =
        rawText.includes("@Sport Cafe") ||
        rawText.includes("@Sport") ||
        rawText.includes("助手") ||
        rawText.toLowerCase().includes("cafe");

      if (isGroupChat && !isCallingBot) {
        continue;
      }

      // 1.5. 網址開頭自動處理 awaiting_video_upload
      if (rawText.startsWith("http://") || rawText.startsWith("https://")) {
        if (REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          const awaitingVideoUpload = await client.get("awaiting_video_upload");

          if (awaitingVideoUpload === "1") {
            const newVideoUrl = rawText;
            await client.set("site_promo_video_draft", newVideoUrl);
            await client.del("awaiting_video_upload");

            // Re-generate script using the new video (if possible to fetch a preview, but here we just re-trigger for the topic)
            const draftScriptStr = await client.get("site_ai_video_script_draft");
            let topic = "SPORT CAFÉ 品牌介紹";
            if (draftScriptStr) {
              try {
                const s = JSON.parse(draftScriptStr);
                topic = s.title || topic;
              } catch(e) {}
            }
            const newScript = await generateAiVideoScript(topic);
            await client.set("site_ai_video_script_draft", JSON.stringify(newScript));

            await client.quit();

            try { revalidatePath("/"); } catch {}

            const siteUrl = req.nextUrl.origin;

            await replyLine(
              replyToken,
              `【Sport Cafe 管理助手】\n已成功接收影片網址並推送至內部審片室！請點擊下方連結預覽審片：\n${siteUrl}/?preview=video\n\n（若需確認上架，請回覆「確認上架影片」）`
            );
            continue;
          }
          await client.quit();
        }
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


      // v6.2 AI 製片 Commands
      const aiVideoGenMatch = cleanText.match(/^AI製片\s*[：:]?\s*(.+)$/i);
      if (aiVideoGenMatch && REDIS_URL) {
        const theme = aiVideoGenMatch[1].trim();
        try {
          const scriptObj = await generateAiVideoScript(theme, null);
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_ai_video_script_draft", JSON.stringify(scriptObj));
          await client.set("awaiting_video_upload", "1", { EX: 300 });
          await client.quit();

          const siteUrl = req.nextUrl.origin;
          try { revalidatePath("/"); } catch {}

          await replyLine(
            replyToken,
            `✅ 已為「${theme}」生成全新 v6.2 AI 影片腳本！

您現在可以上傳影片檔案，或是點擊下方連結進入內部審片室預覽疊加效果：
${siteUrl}/?preview=video`
          );
          continue;
        } catch (e) {
          console.error(e);
          await replyLine(replyToken, `❌ 生成失敗，請稍後再試。`);
          continue;
        }
      }

      const aiVideoModifyMatch = cleanText.match(/^修改製片\s*[：:]?\s*(.+)$/i);
      if (aiVideoModifyMatch && REDIS_URL) {
        const modifyReq = aiVideoModifyMatch[1].trim();
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        const existingScript = await client.get("site_ai_video_script_draft") || await client.get("site_ai_video_script");

        try {
          const scriptObj = await generateAiVideoScript(modifyReq, existingScript);
          await client.set("site_ai_video_script_draft", JSON.stringify(scriptObj));
          await client.quit();

          const siteUrl = req.nextUrl.origin;
          try { revalidatePath("/"); } catch {}

          await replyLine(
            replyToken,
            `✅ 已根據您的要求修改 v6.2 AI 影片腳本！請點擊下方連結預覽：
${siteUrl}/?preview=video`
          );
          continue;
        } catch(e) {
          await client.quit();
          await replyLine(replyToken, `❌ 修改腳本失敗，請稍後再試。`);
          continue;
        }
      }

      if (cleanText === "重新製片" && REDIS_URL) {
        try {
          const scriptObj = await generateAiVideoScript("重新生成 SPORT CAFÉ 職人精神 × 少棒熱血應援 (Alternative fresh take)", null);
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_ai_video_script_draft", JSON.stringify(scriptObj));
          await client.quit();

          const siteUrl = req.nextUrl.origin;
          try { revalidatePath("/"); } catch {}

          await replyLine(
            replyToken,
            `✅ 已重新生成 v6.2 AI 影片腳本！請點擊下方連結預覽：
${siteUrl}/?preview=video`
          );
          continue;
        } catch(e) {
          await replyLine(replyToken, `❌ 重新生成失敗，請稍後再試。`);
          continue;
        }
      }

      if (cleanText === "確認上架影片" && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        const draftVideo = await client.get("site_promo_video_draft");
        const draftScript = await client.get("site_ai_video_script_draft");

        if (draftVideo) await client.set("site_promo_video", draftVideo);
        if (draftScript) await client.set("site_ai_video_script", draftScript);

        // Clean up drafts
        await client.del("site_promo_video_draft");
        await client.del("site_ai_video_script_draft");

        await client.quit();

        const siteUrl = req.nextUrl.origin;
        try { revalidatePath("/"); } catch {}

        await replyLine(
          replyToken,
          `🎉 影片與 v6.2 AI 腳本已成功發布至正式環境！
官網已即時生效：
${siteUrl}`
        );
        continue;
      }

      if (cleanText === "取消上架影片" && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();

        await client.del("site_promo_video_draft");
        await client.del("site_ai_video_script_draft");
        await client.del("site_ai_video_script");

        await client.quit();

        try { revalidatePath("/"); } catch {}

        await replyLine(
          replyToken,
          `🚫 已取消影片上架並清除草稿。`
        );
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

      // 8.1 網站主視覺背景修改（Redis 高速通道，支援圖片/影片）
      const bgRestoreMatch = cleanText.match(/^(?:恢復|還原)(?:預設)?背景/);
      if (bgRestoreMatch && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.del("site_hero_image");
        await client.quit();
        try { revalidatePath("/"); } catch {}

        await new Promise((resolve) => setTimeout(resolve, 20000));
        const screenshot = await captureWebsiteScreenshot();
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已為您恢復網站預設背景！\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 8.1.5 準備上傳背景
      const uploadBgMatch = rawText.match(/@Sport\s*Cafe\s*(管理)?助手\s*上傳背景/) || cleanText.match(/^(?:準備換背景|主題背景更換|更換背景|換背景)/);
      if (uploadBgMatch && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.set("awaiting_bg_upload", "1", { EX: 300 });
        await client.quit();

        await replyLine(
          replyToken,
          "請在 5 分鐘內直接傳送一張照片到群組，我會立刻幫您換成官網首頁背景！"
        );
        continue;
      }

      // 8.1.6 準備上傳影片
      const uploadVideoMatch = cleanText.match(/^(?:上傳影片|準備換影片)/);
      if (uploadVideoMatch && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.set("awaiting_video_upload", "1", { EX: 300 });
        await client.quit();

        await replyLine(
          replyToken,
          "請在 5 分鐘內直接從手機傳送您的 1 分鐘影片到群組，或直接貼上 YouTube 影片網址！"
        );
        continue;
      }

      // 8.1.7 換影片網址
      const manualVideoMatch = cleanText.match(/^(?:把|將)?(?:網站|首頁|宣傳)?影片(?:網址|連結)?(?:改為|改成|換成|更改為|更改|設為|設定為|新增)[：:\s]*(https?:\/\/\S+)/i);
      if (manualVideoMatch && REDIS_URL) {
        const newVideoUrl = manualVideoMatch[1].trim();
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.set("site_promo_video", newVideoUrl);
        await client.quit();
        try { revalidatePath("/"); } catch {}

        const screenshot = await captureWebsiteScreenshot(undefined, undefined, undefined, newVideoUrl);
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已成功更新網站影片：\n${newVideoUrl}\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 8.1.8 改影片標題
      const titleVideoMatch = cleanText.match(/^(?:把|將)?影片標題(?:改為|改成|換成|更改為|更改|設為|設定為)[：:\s]*(.+)/i);
      if (titleVideoMatch && REDIS_URL) {
        const newVideoTitle = titleVideoMatch[1].trim();
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.set("site_promo_video_title", newVideoTitle);
        await client.quit();
        try { revalidatePath("/"); } catch {}

        const screenshot = await captureWebsiteScreenshot(undefined, undefined, undefined, undefined, newVideoTitle);
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已成功更新影片標題：\n「${newVideoTitle}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 8.1.9 隱藏/恢復影片
      const hideVideoMatch = cleanText.match(/^隱藏影片/);
      if (hideVideoMatch && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.set("site_promo_video", "hidden");
        await client.quit();
        try { revalidatePath("/"); } catch {}

        const screenshot = await captureWebsiteScreenshot(undefined, undefined, undefined, "hidden");
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已隱藏宣傳影片區塊！\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      const showVideoMatch = cleanText.match(/^(?:顯示影片|恢復預設影片)/);
      if (showVideoMatch && REDIS_URL) {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.del("site_promo_video");
        await client.quit();
        try { revalidatePath("/"); } catch {}

        const screenshot = await captureWebsiteScreenshot();
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已恢復預設宣傳影片！\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }


      // 8.1.10 恢復上一版
      const restoreMatch = cleanText.match(/^(?:恢復上一版|恢復回上一版|還原上一版|恢復前一版)/);
      if (restoreMatch && GITHUB_TOKEN) {
        try {
          // 先取得目前線上的最新內容與 sha
          const currFileRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/app/page.tsx`, {
            headers: {
              "Authorization": `Bearer ${GITHUB_TOKEN}`,
              "Accept": "application/vnd.github.v3+json",
              "User-Agent": "Sport-Cafe-Bot"
            },
            cache: "no-store"
          });
          const currFileData = await currFileRes.json();
          const currContentBase64 = currFileData.content || "";
          const currContent = Buffer.from(currContentBase64, 'base64').toString('utf8');
          const currentSha = currFileData.sha;

          let previousContent = "";
          let redisClient;

          // 第一重保障：從 Redis 讀取備份
          if (REDIS_URL) {
            redisClient = createClient({ url: REDIS_URL });
            await redisClient.connect();
            previousContent = (await redisClient.get("site_page_prev_backup")) || "";
          }

          // 如果 Redis 沒資料，嘗試第二重保障：從 GitHub Commits API 取得前一版
          if (!previousContent) {
            const commitsRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?path=src/app/page.tsx&per_page=2`, {
              headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Sport-Cafe-Bot"
              }
            });
            const commitsData = await commitsRes.json();

            if (commitsRes.ok && commitsData.length > 1) {
              const previousCommitSha = commitsData[1].sha;

              const fileRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/app/page.tsx?ref=${previousCommitSha}`, {
                headers: {
                  "Authorization": `Bearer ${GITHUB_TOKEN}`,
                  "Accept": "application/vnd.github.v3+json",
                  "User-Agent": "Sport-Cafe-Bot"
                }
              });
              const fileData = await fileRes.json();

              if (fileRes.ok && fileData.content) {
                previousContent = Buffer.from(fileData.content, 'base64').toString('utf8');
              }
            }
          }

          if (previousContent) {
            const updateRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/src/app/page.tsx`, {
              method: 'PUT',
              headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "Sport-Cafe-Bot"
              },
              body: JSON.stringify({
                message: 'Revert: 恢復上一版 src/app/page.tsx',
                content: Buffer.from(previousContent).toString('base64'),
                sha: currentSha
              })
            });

            if (updateRes.ok) {
              // 恢復成功後，將被覆蓋的版本存入 Redis 備份（交換）
              if (redisClient) {
                await redisClient.set("site_page_prev_backup", currContent);
                await redisClient.quit();
              }

              await waitForDeployment();
              const screenshot = await captureWebsiteScreenshot();
              await replyLine(
                replyToken,
                '【Sport Cafe 管理助手】\n已成功為您恢復為上一版的版面狀態！',
                screenshot
              );
              continue;
            } else {
              if (redisClient) await redisClient.quit();
              await replyLine(replyToken, '【Sport Cafe 管理助手】恢復失敗：更新 GitHub 檔案時發生錯誤。');
              continue;
            }
          } else {
             if (redisClient) await redisClient.quit();
             await replyLine(replyToken, '【Sport Cafe 管理助手】恢復失敗：找不到前一版的歷史紀錄。');
             continue;
          }
        } catch(e) {
           await replyLine(replyToken, '【Sport Cafe 管理助手】恢復失敗：發生系統例外錯誤。');
           continue;
        }
      }
      const manualBgMatch = cleanText.match(/^(?:把|將)?(?:網站|首頁)?背景(?:圖|圖片|照片|影片|視覺)?(?:改為|改成|換成|更改為|更改|修改為|修改|設為|設定為)[：:\s]*(https?:\/\/\S+)/i);
      if (manualBgMatch && REDIS_URL) {
        const newBgUrl = manualBgMatch[1].trim();
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.set("site_hero_image", newBgUrl);
        await client.quit();
        try { revalidatePath("/"); } catch {}

        await new Promise((resolve) => setTimeout(resolve, 20000));
        const screenshot = await captureWebsiteScreenshot(undefined, undefined, newBgUrl);
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已成功更新網站背景：\n${newBgUrl}\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 8.2 AI 自動生圖換背景
      const autoBgMatch = cleanText.match(/^(?:背景生圖|AI生圖|生成背景|產生背景|生圖換背景)[：:\s]*(.+)/i);
      if (autoBgMatch && REDIS_URL && GEMINI_API_KEY) {
        const userPrompt = autoBgMatch[1].trim();
        const englishPrompt = await translateToEnglishPrompt(userPrompt) + ", high-end commercial photography, warm lighting, cinematic, vertical 4:5 aspect ratio, no text";

        let finalBase64 = "";
        let finalMime = "";
        let isSuccess = false;

        // 嘗試第一順位: gemini-2.0-flash-preview-image-generation (or exp)
        try {
          const genRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Generate a high quality vertical photo: " + englishPrompt }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
            })
          });

          if (genRes.ok) {
            const data = await genRes.json();
            const parts = data?.candidates?.[0]?.content?.parts || [];
            for (const p of parts) {
              if (p.inlineData?.data) {
                finalBase64 = p.inlineData.data;
                finalMime = p.inlineData.mimeType || "image/jpeg";
                isSuccess = true;
                break;
              }
            }
          }
        } catch (e) {
          console.error("Gemini image gen error 1:", e);
        }

        // 嘗試第二順位: imagen-3.0-generate-002
        if (!isSuccess) {
          try {
            const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [{ prompt: englishPrompt }],
                parameters: { sampleCount: 1, aspectRatio: "3:4" }
              })
            });
            if (imgRes.ok) {
              const data = await imgRes.json();
              if (data?.predictions?.[0]?.bytesBase64Encoded) {
                finalBase64 = data.predictions[0].bytesBase64Encoded;
                finalMime = "image/jpeg";
                isSuccess = true;
              }
            }
          } catch (e) {
            console.error("Gemini image gen error 2:", e);
          }
        }

        const client = createClient({ url: REDIS_URL });
        await client.connect();

        let newBgUrl = "";

        if (isSuccess && finalBase64) {
          await client.set("site_hero_image_b64", finalBase64);
          await client.set("site_hero_image_mime", finalMime);
          newBgUrl = `${req.nextUrl.origin}/api/line?hero_img=1&t=${Date.now()}`;
          await client.set("site_hero_image", newBgUrl);
        } else {
          // 【高質感真實攝影備援】
          const fallbackUrls = [
            "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80",
            "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80",
            "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80",
            "https://images.unsplash.com/photo-1541167760496-1628856ab772?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80",
            "https://images.unsplash.com/photo-1444419988131-046ed4e5ffd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80",
            "https://images.unsplash.com/photo-1511886929837-354d827aae26?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80",
            "https://images.unsplash.com/photo-1506869640319-ce1c3603d9e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80",
            "https://images.unsplash.com/photo-1517505298132-7ee0f91ceeb5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80"
          ];

          const selectionPrompt = `Based on the prompt: "${englishPrompt}", pick the most suitable image URL from the following list. Return ONLY the URL, no quotes or other text:\n` + fallbackUrls.join("\n");
          let bestUrl = fallbackUrls[0];

          try {
            const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: selectionPrompt }] }],
                generationConfig: { temperature: 0.1 }
              })
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const picked = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (picked && fallbackUrls.includes(picked)) {
                bestUrl = picked;
              }
            }
          } catch (e) {
            console.error("Gemini fallback selection error:", e);
          }

          newBgUrl = bestUrl;
          await client.set("site_hero_image", newBgUrl);
        }

        await client.quit();
        try { revalidatePath("/"); } catch {}

        await new Promise((resolve) => setTimeout(resolve, 20000));
        const screenshot = await captureWebsiteScreenshot(undefined, undefined, newBgUrl);
        await replyLine(
          replyToken,
          `已為您 AI 生成並更新網站背景！\n\n生成提示詞：${englishPrompt}\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 8.5 動態主題商品管理
      if (REDIS_URL) {
        const resetMatch = cleanText.match(/^(?:重置主題商品|恢復預設商品)/i);
        if (resetMatch) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.del("site_themes_json");
          await client.quit();
          await replyLine(replyToken, "【Sport Cafe 管理助手】\n已成功為您恢復為預設主題商品！");
          continue;
        }

        const addProductMatch = cleanText.match(/^新增商品[：:\s]*([^｜|]+)[｜|]([^｜|]+)[｜|]([^｜|]+)[｜|]([^｜|]+)(?:[｜|](.+))?/i);
        if (addProductMatch) {
          const [ , themeKeyword, name, price, spec, imgUrl ] = addProductMatch;
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          const site_themes_json = await client.get("site_themes_json");
          let themes = [];
          if (site_themes_json) {
            try { themes = JSON.parse(site_themes_json); } catch {}
          } else {
            themes = [
              { title: "極致職人手沖咖啡", desc: "嚴選莊園單品，極致日式手沖工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop", products: [ { id: "c1", name: "衣索比亞 耶加雪菲 日曬 G1", badge: "人氣單品", price: "NT$ 200 / 杯", spec: "淺焙手沖｜馥郁柑橘花香與熱帶水果甜感，尾韻乾淨綿長。", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop" }, { id: "c2", name: "巴拿馬 翡翠莊園 綠標藝伎 Geisha", badge: "莊園限量", price: "NT$ 450 / 杯", spec: "極致日式點滴手沖｜標誌性茉莉花香、佛手柑與水蜜桃蜜甜韻。", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop" }, { id: "c3", name: "職人醇厚深焙 濾掛咖啡禮盒 (10入)", badge: "伴手禮首選", price: "NT$ 580 / 盒", spec: "中深焙特調｜黑巧克力與焦糖堅果香氣，居家與球場隨時享受。", img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=600&auto=format&fit=crop" } ] },
              { title: "職人裝備嚴選", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop", products: [ { id: "e1", name: "日規職人手作 實戰內野手套", badge: "日本牛皮", price: "NT$ 8,800", spec: "日本進口硬式/軟式皮革｜職人刀模定型，極致接球手感與紮實球袋。", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=600&auto=format&fit=crop" }, { id: "e2", name: "高反發平衡配重 少棒/青少棒打擊棒", badge: "店內可借測", price: "NT$ 6,500", spec: "日規配重設計｜提升揮棒初速與甜蜜點傳導，支援門市實測體驗。", img: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=600&auto=format&fit=crop" }, { id: "e3", name: "職業級防滑小羊皮打擊手套組", badge: "實戰必備", price: "NT$ 1,680", spec: "高貼合度立體剪裁｜強化手腕包覆與掌心止滑，揮擊不滑手。", img: "https://images.unsplash.com/photo-1562077772-3bd90403f7f0?q=80&w=600&auto=format&fit=crop" } ] },
              { title: "專業訓練課程", desc: "為運動員與品味人士特調的機能補給與訓練。", tag: "TRAINING", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop", products: [ { id: "t1", name: "日式打擊機制與揮棒軌跡 一對一特訓", badge: "名師指導", price: "NT$ 2,500 / 堂", spec: "60分鐘專項檢測｜結合高速攝影動作分析，精準修正發力順序與擊球仰角。", img: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=600&auto=format&fit=crop" }, { id: "t2", name: "內野守備步法與傳球協調專項班", badge: "少棒熱銷", price: "NT$ 1,800 / 堂", spec: "下盤重心轉換與接傳流暢度訓練｜建立日本少棒標準基本功。", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=600&auto=format&fit=crop" }, { id: "t3", name: "運動員賽前機能咖啡＆修復補給套組", badge: "職人特調", price: "NT$ 880 / 組", spec: "專注力提升手沖飲品＋賽後電解質與優質蛋白補給方案。", img: "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=600&auto=format&fit=crop" } ] },
              { title: "台日國際交流", desc: "結合仙台草野塾與台灣少棒的深度交流。", tag: "EXCHANGE", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop", products: [ { id: "x1", name: "日本東北・仙台草野塾 移地訓練專案", badge: "仙台直通", price: "專案預約諮詢", spec: "前日職名將草野大輔親自指導｜結合日式室內訓練場與在地文化深度體驗。", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop" }, { id: "x2", name: "台日少棒友誼交流賽＆家庭應援團", badge: "年度盛事", price: "專案預約諮詢", spec: "安排日本在地少棒強權交流賽、球場參訪、隨團翻譯與專業賽事攝影紀錄。", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=600&auto=format&fit=crop" }, { id: "x3", name: "日本客座教練來台 球團/校隊包班講習", badge: "團體預約", price: "專案預約諮詢", spec: "引進正統日本棒球訓練課表與觀念講座，提供球隊客製化技術升級。", img: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=600&auto=format&fit=crop" } ] }
            ];
          }

          let themeIndex = themes.findIndex((t: any) => t.title.includes(themeKeyword.trim()) || t.tag.includes(themeKeyword.trim()));
          if (themeIndex === -1) themeIndex = 0;

          const newProduct = {
            id: `p_${Date.now()}`,
            name: name.trim(),
            badge: "新品上市",
            price: price.trim(),
            spec: spec.trim(),
            img: imgUrl?.trim() || themes[themeIndex].img || "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=600&auto=format&fit=crop"
          };

          if (!themes[themeIndex].products) themes[themeIndex].products = [];
          themes[themeIndex].products.push(newProduct);

          await client.set("site_themes_json", JSON.stringify(themes));
          await client.quit();

          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功為您在主題【${themes[themeIndex].title}】新增商品：\n${newProduct.name}\n${newProduct.price}\n\n已即時同步至官網商品櫃！`
          );
          continue;
        }

        const deleteProductMatch = cleanText.match(/^刪除商品[：:\s]*(.+)/i);
        if (deleteProductMatch) {
          const deleteKeyword = deleteProductMatch[1].trim();
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          const site_themes_json = await client.get("site_themes_json");
          let themes = [];
          let deletedCount = 0;

          if (site_themes_json) {
            try { themes = JSON.parse(site_themes_json); } catch {}
          } else {
            themes = [
              { title: "極致職人手沖咖啡", desc: "嚴選莊園單品，極致日式手沖工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop", products: [ { id: "c1", name: "衣索比亞 耶加雪菲 日曬 G1", badge: "人氣單品", price: "NT$ 200 / 杯", spec: "淺焙手沖｜馥郁柑橘花香與熱帶水果甜感，尾韻乾淨綿長。", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop" }, { id: "c2", name: "巴拿馬 翡翠莊園 綠標藝伎 Geisha", badge: "莊園限量", price: "NT$ 450 / 杯", spec: "極致日式點滴手沖｜標誌性茉莉花香、佛手柑與水蜜桃蜜甜韻。", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop" }, { id: "c3", name: "職人醇厚深焙 濾掛咖啡禮盒 (10入)", badge: "伴手禮首選", price: "NT$ 580 / 盒", spec: "中深焙特調｜黑巧克力與焦糖堅果香氣，居家與球場隨時享受。", img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=600&auto=format&fit=crop" } ] },
              { title: "職人裝備嚴選", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop", products: [ { id: "e1", name: "日規職人手作 實戰內野手套", badge: "日本牛皮", price: "NT$ 8,800", spec: "日本進口硬式/軟式皮革｜職人刀模定型，極致接球手感與紮實球袋。", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=600&auto=format&fit=crop" }, { id: "e2", name: "高反發平衡配重 少棒/青少棒打擊棒", badge: "店內可借測", price: "NT$ 6,500", spec: "日規配重設計｜提升揮棒初速與甜蜜點傳導，支援門市實測體驗。", img: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=600&auto=format&fit=crop" }, { id: "e3", name: "職業級防滑小羊皮打擊手套組", badge: "實戰必備", price: "NT$ 1,680", spec: "高貼合度立體剪裁｜強化手腕包覆與掌心止滑，揮擊不滑手。", img: "https://images.unsplash.com/photo-1562077772-3bd90403f7f0?q=80&w=600&auto=format&fit=crop" } ] },
              { title: "專業訓練課程", desc: "為運動員與品味人士特調的機能補給與訓練。", tag: "TRAINING", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop", products: [ { id: "t1", name: "日式打擊機制與揮棒軌跡 一對一特訓", badge: "名師指導", price: "NT$ 2,500 / 堂", spec: "60分鐘專項檢測｜結合高速攝影動作分析，精準修正發力順序與擊球仰角。", img: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=600&auto=format&fit=crop" }, { id: "t2", name: "內野守備步法與傳球協調專項班", badge: "少棒熱銷", price: "NT$ 1,800 / 堂", spec: "下盤重心轉換與接傳流暢度訓練｜建立日本少棒標準基本功。", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=600&auto=format&fit=crop" }, { id: "t3", name: "運動員賽前機能咖啡＆修復補給套組", badge: "職人特調", price: "NT$ 880 / 組", spec: "專注力提升手沖飲品＋賽後電解質與優質蛋白補給方案。", img: "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=600&auto=format&fit=crop" } ] },
              { title: "台日國際交流", desc: "結合仙台草野塾與台灣少棒的深度交流。", tag: "EXCHANGE", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop", products: [ { id: "x1", name: "日本東北・仙台草野塾 移地訓練專案", badge: "仙台直通", price: "專案預約諮詢", spec: "前日職名將草野大輔親自指導｜結合日式室內訓練場與在地文化深度體驗。", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop" }, { id: "x2", name: "台日少棒友誼交流賽＆家庭應援團", badge: "年度盛事", price: "專案預約諮詢", spec: "安排日本在地少棒強權交流賽、球場參訪、隨團翻譯與專業賽事攝影紀錄。", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=600&auto=format&fit=crop" }, { id: "x3", name: "日本客座教練來台 球團/校隊包班講習", badge: "團體預約", price: "專案預約諮詢", spec: "引進正統日本棒球訓練課表與觀念講座，提供球隊客製化技術升級。", img: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=600&auto=format&fit=crop" } ] }
            ];
          }

          themes.forEach((theme: any) => {
            if (theme.products) {
              const initLength = theme.products.length;
              theme.products = theme.products.filter((p: any) => !p.name.includes(deleteKeyword));
              deletedCount += (initLength - theme.products.length);
            }
          });

          await client.set("site_themes_json", JSON.stringify(themes));
          await client.quit();

          await replyLine(
            replyToken,
            deletedCount > 0
              ? `【Sport Cafe 管理助手】\n已成功為您刪除包含「${deleteKeyword}」的商品共 ${deletedCount} 筆！`
              : `【Sport Cafe 管理助手】\n找不到包含「${deleteKeyword}」的商品。`
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
          await waitForDeployment(result.expectedText);
          const newScreenshotUrl = await captureWebsiteScreenshot();
          await replyLine(
            replyToken,
            `【Sport Cafe AI 工程師 (由 ${result.modelName || "AI"} 提供)】🛠️\n已成功為您調整網站代碼：${result.message}！\n\n⚡ 已自動推送到 GitHub 並完成部署，附上最新畫面！`,
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
