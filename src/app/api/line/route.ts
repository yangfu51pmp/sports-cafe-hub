import { NextResponse } from "next/server";
import crypto from "crypto";

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID || "";

// 驗證 LINE 數位簽章，確保請求真實來自 LINE
function verifySignature(body: string, signature: string): boolean {
  if (!CHANNEL_SECRET) return true;
  const hash = crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
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

        // 專屬安全鎖：只回應你本人的管理者 LINE ID
        if (userId !== ADMIN_USER_ID) {
          await sendLineReply(replyToken, "此為門市管理專用通道，非授權人員無法操作。");
          continue;
        }

        // 解析管理者指令
        if (userText.startsWith("更新公告")) {
          const content = userText.replace("更新公告", "").trim();
          await sendLineReply(
            replyToken,
            `【Sport Cafe 管理通知】\n✅ 門市公告已收到指令：\n「${content}」\n系統正同步至官方網站！`
          );
        } else if (userText.startsWith("更新標題")) {
          const content = userText.replace("更新標題", "").trim();
          await sendLineReply(
            replyToken,
            `【Sport Cafe 管理通知】\n✅ 首頁形象標題指令：\n「${content}」\n網站即刻更新！`
          );
        } else {
          await sendLineReply(
            replyToken,
            "【Sport Cafe 遠端管理系統】\n身分驗證通過！請輸入管理指令：\n\n1. 更新公告 [內容]\n2. 更新標題 [新標題]\n\n範例：\n更新公告 仙台店跨國交流訓練進行中"
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

// 呼叫 LINE Messaging API 發送回覆
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