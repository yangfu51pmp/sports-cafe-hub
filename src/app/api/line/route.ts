import { NextRequest, NextResponse } from "next/server";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

async function replyLine(replyToken: string, text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return;
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const rawText = event.message.text.trim();
      const replyToken = event.replyToken;

      // 直接回覆收到的內容，確保機器人有反應
      await replyLine(replyToken, `【Sport Cafe 管理助手】收到您的指令：${rawText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
