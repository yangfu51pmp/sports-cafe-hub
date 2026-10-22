import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1. 排除 LINE Webhook 與 Next.js 內部靜態資源
  if (
    pathname.startsWith("/api/line") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 2. 雲端截圖專屬快速通道（確保截圖機器人能拍到完整頁面）
  const previewKey = req.nextUrl.searchParams.get("preview_key");
  if (previewKey === "cafe888") {
    return NextResponse.next();
  }

  // 3. 一般訪客 Basic Auth 帳密檢查
  const basicAuth = req.headers.get("authorization");

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(" ")[1];
      const [user, pwd] = atob(authValue).split(":");

      if (user === "admin" && pwd === "cafe888") {
        return NextResponse.next();
      }
    } catch {
      // 驗證失敗繼續往下拋出 401
    }
  }

  // 4. 未通過驗證跳出輸入框
  return new NextResponse("Sport Café 專屬預覽：請輸入管理密碼訪問", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Sport Cafe Private Staging"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
