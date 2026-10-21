import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // 1. 排除 LINE Webhook 與 Next.js 內部資源，確保 LINE 機器人運作不受影響
  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith("/api/line") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 2. 檢查訪客是否有輸入正確的帳號密碼
  const basicAuth = req.headers.get("authorization");

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [user, pwd] = atob(authValue).split(":");

    // 預設帳號為 admin，密碼可自行修改（例如：cafe888）
    if (user === "admin" && pwd === "cafe888") {
      return NextResponse.next();
    }
  }

  // 3. 未通過驗證時，要求瀏覽器跳出密碼輸入視窗
  return new NextResponse("Sport Café 專屬預覽：請輸入管理密碼訪問", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Sport Cafe Private Staging"',
    },
  });
}

// 作用於全站所有頁面
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
