import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "redis";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
// 支援多位管理者，以逗號分隔 ID
const ADMIN_USER_IDS = (process.env.LINE_ADMIN_USER_ID || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || "";

// 驗證 LINE 數位簽章
function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return true;
  const hash = crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

// 建立資料庫連線
async function getRedis() {
  if (!REDIS_URL) return null;
  const client = createClient({ url: REDIS_URL });
  client.on("error", (err) => console.error("Redis Error:", err));
  await client.connect();
  return client;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(rawBody);
    const events = data.events || [];

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userId = event.source.userId;
        const userText = event.message.text.trim();
        const replyToken = event.replyToken;

        // 安全白名單防護：未授權人員傳訊時，自動回傳其 User ID 方便陳總授權
        if (!ADMIN_USER_IDS.includes(userId)) {
          await sendLineReply(
            replyToken,
            `【Sport Cafe 管理通知】\n此帳號尚未取得編輯權限。\n如需共同管理，請將此 ID 提供給管理員加入白名單：\n\n${userId}`
          );
          continue;
        }

        const redis = await getRedis();

        // 處理更新公告
        if (userText.startsWith("更新公告")) {
          const content = userText.replace("更新公告", "").trim();
          if (redis) {
            await redis.set("site_announcement", content);
            await redis.quit();
          }
          await sendLineReply(
            replyToken,
            `【Sport Cafe 官網已同步更新】\n🎉 門市最新公告已發布：\n「${content}」\n\n點擊查看官網即時畫面：\nhttps://sports-cafe-hub.vercel.app`
          );
        }
        // 處理更新首頁標題
        else if (userText.startsWith("更新標題")) {
          const content = userText.replace("更新標題", "").trim();
          if (redis) {
            await redis.set("site_title", content);
            await redis.quit();
          }
          await sendLineReply(
            replyToken,
            `【Sport Cafe 官網已同步更新】\n🎉 首頁形象標題已變更為：\n「${content}」\n\n點擊查看官網即時畫面：\nhttps://sports-cafe-hub.vercel.app`
          );
        }
        // 未知指令回傳操作選單
        else {
          await sendLineReply(
            replyToken,
            "【Sport Cafe 遠端管理系統】\n管理者身分認證成功！請輸入以下指令：\n\n1. 更新公告 [內容]\n2. 更新標題 [新標題]\n\n範例：\n更新公告 仙台店跨國交流訓練進行中"
          );
        }
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("LINE Webhook Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

async function sendLineReply(replyToken: string, text: string) {
  if (!CHANNEL_ACCESS_TOKEN || !replyToken) return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}