import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "redis";

// 設定雲端函式最長執行時間為 60 秒
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

// 全光譜精選 4K 圖庫字典（精準切分咖啡特寫、不同呈現方式與空間氛圍）
const CURATED_IMAGES = {
  // 1. 最初原版經典美式（白瓷杯俯瞰、細緻 Crema 黑咖啡特寫）
  original_americano: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1600&auto=format&fit=crop",

  // 2. 質感冰美式咖啡（玻璃杯冰塊清涼特寫，美式咖啡的另一種經典呈現）
  iced_americano: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=1600&auto=format&fit=crop",

  // 3. 職人手沖黑咖啡滴落特寫（原木桌面滴漏細節）
  pourover_coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop",

  // 4. 精品拿鐵拉花特寫（咖啡杯拉花工藝）
  latte_art: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop",

  // 5. 咖啡豆與深焙萃取（純黑咖啡元素特寫）
  coffee_extraction: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1600&auto=format&fit=crop",

  // 6. 日式極簡精品咖啡吧台（空間裝潢）
  japanese_cafe_bar: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1600&auto=format&fit=crop",

  // 7. 高奢精品咖啡廳室內（空間裝潢）
  luxury_cafe_space: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1600&auto=format&fit=crop",

  // 8. 棒球選手打擊 / 夜間球場
  baseball_action: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1600&auto=format&fit=crop",

  // 9. 棒球手套與紅線球特寫
  baseball_gear: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=1600&auto=format&fit=crop",
};

// 讀取 Redis 對話記憶（最近 10 則）
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
    console.error("讀取對話記憶失敗:", e);
    return "";
  }
}

// 儲存對話記憶到 Redis
async function appendChatHistory(chatId: string, userText: string, assistantSummary: string) {
  if (!REDIS_URL) return;
  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const raw = await client.get(`chat_memory_${chatId}`);
    let list: Array<{ role: string; text: string }> = raw ? JSON.parse(raw) : [];

    list.push({ role: "user", text: userText });
    list.push({ role: "assistant", text: assistantSummary });

    if (list.length > 10) {
      list = list.slice(-10);
    }

    await client.set(`chat_memory_${chatId}`, JSON.stringify(list));
    await client.quit();
  } catch (e) {
    console.error("儲存對話記憶失敗:", e);
  }
}

// 1. 即時被動回覆函式
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
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
  } catch (err) {
    console.error("LINE replyLine 失敗:", err);
  }
}

// 2. 主動推播訊息函式
async function pushLine(to: string, text: string, imageUrl?: string | null) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !to) return;

  const messages: any[] = [{ type: "text", text }];

  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });
  } catch (err) {
    console.error("LINE pushLine 失敗:", err);
  }
}

// 3. 雲端無人瀏覽器即時截圖
async function captureWebsiteScreenshot(device: "mobile" | "desktop" = "mobile"): Promise<string | null> {
  try {
    const isDesktop = device === "desktop";
    const targetUrl = `https://sports-cafe-hub.vercel.app?preview_key=cafe888&t=${Date.now()}`;
    const width = isDesktop ? 1280 : 390;
    const height = isDesktop ? 800 : 844;
    const isMobileParam = isDesktop ? "false" : "true";

    const screenshotApi = `https://api.microlink.io?url=${encodeURIComponent( targetUrl )}&screenshot=true&viewport.isMobile=${isMobileParam}&viewport.width=${width}&viewport.height=${height}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8500);

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

// 5. GitHub 程式碼修改核心（結合上下文記憶）
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

【最近對話脈絡（用於解讀代名詞如「最初的圖」、「另一種呈現」、「上一次改的」）】：
${chatHistory || "（目前暫無近期對話紀錄）"}

【精選圖庫映射（嚴格區分「咖啡杯特寫」與「空間裝潢」）】：
- 最初原版經典美式咖啡（白瓷杯俯瞰特寫、細緻 Crema 黑咖啡）: "${CURATED_IMAGES.original_americano}"
- 質感冰美式咖啡（透明玻璃杯冰塊特寫，美式咖啡另一種經典形式）: "${CURATED_IMAGES.iced_americano}"
- 職人手沖黑咖啡滴落特寫: "${CURATED_IMAGES.pourover_coffee}"
- 精緻拿鐵拉花咖啡特寫: "${CURATED_IMAGES.latte_art}"
- 咖啡豆與萃取特寫: "${CURATED_IMAGES.coffee_extraction}"
- 日式極簡咖啡吧台空間照: "${CURATED_IMAGES.japanese_cafe_bar}"
- 高奢咖啡廳室內空間照: "${CURATED_IMAGES.luxury_cafe_space}"
- 棒球打擊 / 夜間球場: "${CURATED_IMAGES.baseball_action}"
- 棒球手套與紅線球特寫: "${CURATED_IMAGES.baseball_gear}"
${customUrlMatch ? `- 用戶指定的自選圖片: "${customUrlMatch[0]}"` : ""}

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
        .replace(/@Sport\s*Caf[eé]\s*(管理)?助手/gi, "")
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

      const isDesktopIntent =
        cleanText.includes("電腦") ||
        cleanText.includes("桌機") ||
        cleanText.includes("筆電") ||
        cleanText.includes("桌面");

      // 4. 手動截圖指令
      const screenshotKeywords = ["截圖", "截取", "畫面", "看網站", "看首頁", "首頁圖", "預覽"];
      if (screenshotKeywords.some((kw) => cleanText.includes(kw)) && !cleanText.includes("改") && !cleanText.includes("換") && !cleanText.includes("回")) {
        const deviceType = isDesktopIntent ? "desktop" : "mobile";
        const screenshot = await captureWebsiteScreenshot(deviceType);
        await replyLine(
          replyToken,
          `【Sport Cafe 管理助手】\n已為您即時抓取最新【${isDesktopIntent ? "電腦寬螢幕版" : "手機版"}】官網畫面：\nhttps://sports-cafe-hub.vercel.app`,
          screenshot
        );
        continue;
      }

      // 5. 稱讚與日常互動
      const praiseKeywords = ["很棒", "讚", "太棒", "辛苦", "謝謝", "感謝", "你好", "哈囉", "早安", "晚安", "厲害", "棒棒", "喜歡你"];
      if (praiseKeywords.some((kw) => cleanText.includes(kw)) && cleanText.length < 15 && !cleanText.includes("改") && !cleanText.includes("換") && !cleanText.includes("回") && !cleanText.includes("圖") && !cleanText.includes("http")) {
        await replyLine(
          replyToken,
          "謝謝誇獎！我隨時在線待命，有任何門市公告、首頁換圖、排版或顏色要調整，隨時 @ 我交代即可 😊⚾☕"
        );
        continue;
      }

      // 6. 網址綁定公告
      const urlMatch = rawText.match(/https?:\/\/[^\s]+/i);
      if (urlMatch && (cleanText.includes("連結") || cleanText.includes("公告") || cleanText.includes("網址") || cleanText.includes("直播")) && !cleanText.includes("背景") && !cleanText.includes("圖")) {
        const targetUrl = urlMatch[0];
        if (REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_announcement_url", targetUrl);
          await client.quit();

          const screenshot = await captureWebsiteScreenshot("mobile");
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功將公告連結綁定為：\n${targetUrl}\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 7. 純文字標題與公告修改
      if (cleanText.startsWith("標題改為") || cleanText.startsWith("標題換成")) {
        let newTitle = cleanText.replace(/^標題(改為|換成)[：:\s]*/, "").trim();
        if (newTitle && REDIS_URL) {
          const client = createClient({ url: REDIS_URL });
          await client.connect();
          await client.set("site_title", newTitle);
          await client.quit();

          const screenshot = await captureWebsiteScreenshot("mobile");
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

          const screenshot = await captureWebsiteScreenshot("mobile");
          await replyLine(
            replyToken,
            `【Sport Cafe 管理助手】\n已成功更新門市公告：\n「${directNotice}」\n\n官網已即時生效：\nhttps://sports-cafe-hub.vercel.app`,
            screenshot
          );
          continue;
        }
      }

      // 8. 智能代碼修改核心（讀取歷史記憶 + 自動回寫記憶）
      if (GITHUB_TOKEN && cleanText.length > 0) {
        // 讀取該群組最近對話紀錄
        const historyContext = await getChatHistory(targetChatId);

        const result = await modifyFrontendCode(cleanText, historyContext);

        if (result.success) {
          // 儲存本次指令到記憶體
          await appendChatHistory(targetChatId, cleanText, result.message);

          await replyLine(
            replyToken,
            `【Sport Cafe AI 工程師】🛠️\n已為您調整前端代碼：${result.message}！\n\n⚡ 已推送到 GitHub，Vercel 正在部署中。約 25 秒完成後，我會自動拍照回傳【${isDesktopIntent ? "電腦寬螢幕版" : "手機版"}】實機畫面！`
          );

          after(async () => {
            await new Promise((resolve) => setTimeout(resolve, 24000));

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

      // 9. 一般私聊引導
      if (!isGroupChat) {
        await replyLine(
          replyToken,
          "【Sport Cafe 管理助手】\n您可以交代我：\n\n• 換回最初的美式咖啡圖\n• 首頁圖換成冰美式特寫\n• 電腦版按鈕顏色調整為金色\n• 電腦版截圖 / 截圖"
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
