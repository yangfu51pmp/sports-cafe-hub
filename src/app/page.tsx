import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "redis";

interface SiteConfig {
  announcement: string;
  announcement_url?: string;
  title: string;
  description: string;
}

const defaultConfig: SiteConfig = {
  announcement: "民安少棒・巨人盃賽事直播中！",
  announcement_url: "https://www.youtube.com/live/TZuMAgnX3ds?si=zYQDBveiTXe6xOHp",
  title: "民安少棒八強進擊！",
  description: "結合日式極致手沖工藝與專業裝備借測\n300天職人匠心淬鍊・專注升級的現代複合空間",
};

async function getLiveConfig(): Promise<SiteConfig> {
  await connection();
  const REDIS_URL =
    process.env.REDIS_URL ||
    process.env.STORAGE_URL ||
    process.env.KV_URL ||
    "";

  let config = { ...defaultConfig };

  if (REDIS_URL) {
    try {
      const client = createClient({ url: REDIS_URL });
      await client.connect();
      const simpleNotice = await client.get("site_announcement");
      const simpleUrl = await client.get("site_announcement_url");
      const simpleTitle = await client.get("site_title");
      await client.quit();

      if (simpleNotice) config.announcement = simpleNotice;
      if (simpleUrl) config.announcement_url = simpleUrl;
      if (simpleTitle) config.title = simpleTitle;
    } catch (e) {
      console.error("Redis 讀取失敗:", e);
    }
  }

  return config;
}

async function LuxuryWBeautyView() {
  const config = await getLiveConfig();

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-stone-800 pb-20 select-none antialiased">
      {/* 0. 最上方：即時公告與賽事直播橫幅 */}
      {config.announcement && (
        <aside className="bg-[#7A1B28] text-white px-4 py-2 text-center text-xs tracking-wider font-light flex items-center justify-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
          <span className="font-medium truncate max-w-[260px]">
            {config.announcement}
          </span>
          {config.announcement_url && (
            <a
              href={config.announcement_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-200 underline underline-offset-2 ml-1 text-[11px] whitespace-nowrap hover:text-white transition"
            >
              點擊進入直播 ↗
            </a>
          )}
        </aside>
      )}

      {/* 1. 頂部導覽列：英爵風格（左側品牌 LOGO、右側搜尋與選單） */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/70">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          {/* 左側 LOGO */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7A1B28] flex items-center justify-center text-white font-serif font-bold text-sm shadow-sm">
              S
            </div>
            <span className="font-serif tracking-widest text-[#7A1B28] font-bold text-lg">
              SPORT CAFÉ
            </span>
          </div>

          {/* 右側：搜尋放大鏡 + 漢堡選單 */}
          <div className="flex items-center gap-4 text-[#7A1B28]">
            <button
              type="button"
              aria-label="搜尋"
              className="p-1 hover:opacity-75 transition active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {/* 原生純 CSS 展開選單（點擊自動彈出高質感抽屜） */}
            <details className="relative group">
              <summary
                aria-label="選單開關"
                className="list-none p-1 cursor-pointer hover:opacity-75 transition active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-10 w-52 bg-white rounded-2xl shadow-2xl border border-stone-200/80 p-3 py-4 flex flex-col gap-1 z-50 text-stone-700 text-sm">
                <span className="text-[10px] uppercase tracking-widest text-[#7A1B28] font-bold px-3 pb-1 border-b border-stone-100">
                  Navigation
                </span>
                <a href="#services" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">門市服務分類</a>
                <a href="#menu" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">精品手沖豆單</a>
                <a href="#gear" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">運動裝備借測</a>
                <a href="#sendai" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">日本仙台交流基地</a>
                <a href="#branches" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">預約與門市據點</a>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* 2. 主視覺 Hero 區：大片精品模特/意境圖 + 輪播操控點 */}
      <section className="relative max-w-md mx-auto bg-stone-900 overflow-hidden min-h-[460px] flex flex-col justify-end">
        {/* 背景大圖（高質感精品氛圍） */}
        <div
          className="absolute inset-0 bg-cover bg-center brightness-[0.88]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1200&auto=format&fit=crop')`,
          }}
        />

        {/* 漸層漸變遮罩（確保文字極致清晰） */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

        {/* 左側大標題與文案（連動 LINE 指令即時更新） */}
        <div className="relative z-10 px-6 pb-14 text-white">
          <span className="inline-block text-[10px] uppercase tracking-[0.25em] text-amber-200/90 font-semibold mb-2 bg-[#7A1B28]/80 px-2 py-0.5 rounded-sm">
            SPORT CAFÉ EXCLUSIVE
          </span>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-white mb-2 leading-snug drop-shadow-md">
            {config.title}
          </h1>
          <p className="text-stone-200 text-xs leading-relaxed max-w-xs font-light whitespace-pre-line drop-shadow">
            {config.description}
          </p>

          {/* 輪播控制器：Prev / 圓點 / Next */}
          <div className="flex items-center gap-6 mt-6 text-[11px] tracking-widest text-stone-300 font-light">
            <span className="cursor-pointer hover:text-white transition">∠ Prev</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border border-white flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-white" />
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </div>
            <span className="cursor-pointer hover:text-white transition">Next ﹂</span>
          </div>
        </div>
      </section>

      {/* 3. 中間分類卡片：英爵同款白色懸浮圓角卡片與六大經典細線條分類 */}
      <section id="services" className="relative z-20 max-w-md mx-auto -mt-6 px-4">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-stone-200/60">
          <div className="grid grid-cols-3 gap-y-6 gap-x-2 text-center">
            {/* 分類 1 */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
                </svg>
              </div>
              <span className="text-xs font-medium text-stone-800 mt-2.5 tracking-tight">精品手沖</span>
            </div>

            {/* 分類 2 */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
                </svg>
              </div>
              <span className="text-xs font-medium text-stone-800 mt-2.5 tracking-tight">裝備借測</span>
            </div>

            {/* 分類 3 */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-stone-800 mt-2.5 tracking-tight">機能飲品</span>
            </div>

            {/* 分類 4 */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-stone-800 mt-2.5 tracking-tight">仙台交流</span>
            </div>

            {/* 分類 5 */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                  <path strokeLinecap="round" d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" />
                </svg>
              </div>
              <span className="text-xs font-medium text-stone-800 mt-2.5 tracking-tight">打擊體驗</span>
            </div>

            {/* 分類 6 */}
            <div className="flex flex-col items-center group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-stone-800 mt-2.5 tracking-tight">VIP預約</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 門市基地（台北旗艦店 & 仙台交流據點） */}
      <section id="branches" className="max-w-md mx-auto px-5 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg font-bold text-stone-900">門市體驗基地</h2>
          <span className="text-[11px] text-[#7A1B28] font-medium">Taipei ✕ Sendai</span>
        </div>

        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-5 border border-stone-200/70 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] bg-[#7A1B28]/10 text-[#7A1B28] font-bold px-2 py-0.5 rounded">
                台北基地
              </span>
              <h3 className="font-medium text-stone-800 text-sm mt-1.5">台北旗艦體驗館</h3>
              <p className="text-xs text-stone-400 mt-0.5 font-light">營業時間：08:00 - 21:00（全週開放）</p>
            </div>
            <a
              href="https://line.me"
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-stone-900 text-white px-3.5 py-2 rounded-xl font-medium hover:bg-black transition whitespace-nowrap"
            >
              預約參訪
            </a>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200/70 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                跨國交流
              </span>
              <h3 className="font-medium text-stone-800 text-sm mt-1.5">日本仙台交流據點</h3>
              <p className="text-xs text-stone-400 mt-0.5 font-light">台日少棒培訓與裝備對接・採預約制</p>
            </div>
            <a
              href="https://line.me"
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-[#7A1B28] text-white px-3.5 py-2 rounded-xl font-medium hover:bg-[#64141f] transition whitespace-nowrap"
            >
              交流洽詢
            </a>
          </div>
        </div>
      </section>

      {/* 5. 下排吸頂聯繫方式：英爵經典「香檳金金屬漸層」底部固定導覽列 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#BA9868] via-[#D8C49F] to-[#B59261] text-white shadow-2xl border-t border-white/20">
        <div className="max-w-md mx-auto h-14 flex items-center divide-x divide-white/25">
          {/* 按鈕 1：LINE 線上客服 */}
          <a
            href="https://line.me"
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1 px-1 text-center active:opacity-75 transition"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 10.3c0-4.6-5.4-8.3-12-8.3S0 5.7 0 10.3c0 4.1 3.6 7.5 8.5 8.2.3.1.8.2 1 .7.1.3.1.8 0 1.2l-.4 1.5c-.1.5-.6 2-.2 2.3.4.2 1.6-.9 2.5-1.8 2.6-2.6 4.7-3.2 4.7-3.2 4.8-.5 7.9-4.3 7.9-8.9z" />
              </svg>
            </div>
            <div className="text-[11px] leading-tight text-white font-medium drop-shadow-sm text-left">
              線上<br />客服
            </div>
          </a>

          {/* 按鈕 2：諮詢專線 */}
          <a
            href="tel:0225000000"
            className="flex-1 flex items-center justify-center gap-1.5 py-1 px-1 text-center active:opacity-75 transition"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 0 1 2-2h3.28a1 1 0 0 1 .948.684l1.498 4.493a1 1 0 0 1-.502 1.21l-2.257 1.13a11.042 11.042 0 0 0 5.516 5.516l1.13-2.257a1 1 0 0 1 1.21-.502l4.493 1.498a1 1 0 0 1 .684.949V19a2 2 0 0 1-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div className="text-[11px] leading-tight text-white font-medium drop-shadow-sm text-left">
              諮詢<br />專線
            </div>
          </a>

          {/* 按鈕 3：粉專客服 */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1 px-1 text-center active:opacity-75 transition"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.83 1.46 5.36 3.75 6.95v3.42l3.32-1.82c.93.26 1.91.4 2.93.4 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.05 12.18-2.68-2.86-5.23 2.86 5.75-6.11 2.74 2.86 5.17-2.86-5.75 6.11z" />
              </svg>
            </div>
            <div className="text-[11px] leading-tight text-white font-medium drop-shadow-sm text-left">
              粉專<br />客服
            </div>
          </a>

          {/* 按鈕 4：仙台 / 微信客服 */}
          <a
            href="https://weixin.qq.com"
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1 px-1 text-center active:opacity-75 transition"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8.5 4.5C4.36 4.5 1 7.29 1 10.73c0 1.94 1.07 3.68 2.76 4.82L3 18l2.91-1.46c.8.23 1.67.36 2.59.36.27 0 .54-.01.8-.04-.2-.59-.3-1.22-.3-1.86 0-3.72 3.58-6.73 8-6.73.19 0 .37 0 .56.02C16.81 5.92 12.98 4.5 8.5 4.5zm-2.25 4a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zM17 10c-3.87 0-7 2.69-7 6s3.13 6 7 6c.77 0 1.51-.11 2.2-.31L22 23l-.7-2.09c1.07-.98 1.7-2.37 1.7-3.91 0-3.31-3.13-6-7-6zm-2.25 3.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
              </svg>
            </div>
            <div className="text-[11px] leading-tight text-white font-medium drop-shadow-sm text-left">
              仙台<br />客服
            </div>
          </a>
        </div>
      </nav>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center text-xs text-stone-400 font-light">
          Sport Café 載入中...
        </div>
      }
    >
      <LuxuryWBeautyView />
    </Suspense>
  );
}
