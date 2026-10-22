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

async function LuxuryResponsiveView() {
  const config = await getLiveConfig();

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-stone-800 pb-20 md:pb-0 select-none antialiased">
      {/* 0. 即時公告與賽事直播橫幅（全寬置頂） */}
      {config.announcement && (
        <aside className="bg-[#7A1B28] text-white px-4 py-2.5 text-center text-xs md:text-sm tracking-wider font-light flex items-center justify-center gap-2 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
          <span className="font-medium truncate max-w-[280px] md:max-w-2xl">
            {config.announcement}
          </span>
          {config.announcement_url && (
            <a
              href={config.announcement_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-200 underline underline-offset-2 ml-1 text-[11px] md:text-xs whitespace-nowrap hover:text-white transition"
            >
              點擊進入直播 ↗
            </a>
          )}
        </aside>
      )}

      {/* 1. 頂部導覽列（手機精簡／電腦完整展開） */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/70">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          {/* 左側品牌 LOGO */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#7A1B28] flex items-center justify-center text-white font-serif font-bold text-base shadow-sm">
              S
            </div>
            <span className="font-serif tracking-widest text-[#7A1B28] font-bold text-lg md:text-xl">
              SPORT CAFÉ
            </span>
          </div>

          {/* 電腦版選單導覽（md 以上顯示） */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-700">
            <a href="#services" className="hover:text-[#7A1B28] transition">門市服務</a>
            <a href="#services" className="hover:text-[#7A1B28] transition">手沖豆單</a>
            <a href="#services" className="hover:text-[#7A1B28] transition">裝備借測</a>
            <a href="#branches" className="hover:text-[#7A1B28] transition">仙台交流</a>
            <a href="#branches" className="hover:text-[#7A1B28] transition">門市據點</a>
          </nav>

          {/* 右側操作區 */}
          <div className="flex items-center gap-4 text-[#7A1B28]">
            {/* 搜尋圖示 */}
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

            {/* 電腦版獨立預約 CTA 按鈕 */}
            <a
              href="#branches"
              className="hidden md:inline-flex items-center px-4 py-2 rounded-xl bg-[#7A1B28] text-white text-xs font-semibold tracking-wider hover:bg-[#63141f] shadow-sm transition"
            >
              立即預約
            </a>

            {/* 手機版原生抽屜漢堡選單（md 以上自動隱藏） */}
            <details className="relative md:hidden group">
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
                <a href="#services" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">精品手沖豆單</a>
                <a href="#services" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">運動裝備借測</a>
                <a href="#branches" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">日本仙台交流基地</a>
                <a href="#branches" className="px-3 py-2 rounded-xl hover:bg-stone-50 transition font-medium">預約與門市據點</a>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* 2. 主視覺 Hero 區（電腦寬幅橫展／手機精品直立） */}
      <section className="relative w-full bg-stone-900 overflow-hidden min-h-[460px] md:min-h-[580px] lg:min-h-[620px] flex flex-col justify-end">
        {/* 背景大圖 */}
        <div
          className="absolute inset-0 bg-cover bg-center brightness-[0.88]"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1600&auto=format&fit=crop')`,
          }}
        />

        {/* 漸層遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent md:bg-gradient-to-r md:from-black/85 md:via-black/50 md:to-transparent" />

        {/* 大標題文案與輪播器（容器限制在 max-w-6xl 居中） */}
        <div className="relative z-10 max-w-6xl w-full mx-auto px-6 md:px-8 pb-14 md:pb-20 text-white">
          <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.25em] text-amber-200/90 font-semibold mb-3 bg-[#7A1B28]/85 px-2.5 py-1 rounded">
            SPORT CAFÉ EXCLUSIVE
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-white mb-3 md:mb-4 leading-tight drop-shadow-md">
            {config.title}
          </h1>
          <p className="text-stone-200 text-xs md:text-base leading-relaxed max-w-xl font-light whitespace-pre-line drop-shadow">
            {config.description}
          </p>

          {/* 輪播控制點 */}
          <div className="flex items-center gap-6 mt-6 md:mt-8 text-[11px] md:text-xs tracking-widest text-stone-300 font-light">
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

      {/* 3. 中間服務卡片：手機 3 欄 / 電腦一排 6 欄自適應展開 */}
      <section id="services" className="relative z-20 max-w-6xl mx-auto -mt-6 md:-mt-12 px-4 md:px-8">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-stone-200/60">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-y-6 md:gap-4 text-center">
            {/* 分類 1 */}
            <div className="flex flex-col items-center group cursor-pointer p-2 rounded-2xl hover:bg-stone-50 transition-all">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white group-hover:-translate-y-1 transition-all shadow-sm">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-medium text-stone-800 mt-2.5 tracking-tight">精品手沖</span>
            </div>

            {/* 分類 2 */}
            <div className="flex flex-col items-center group cursor-pointer p-2 rounded-2xl hover:bg-stone-50 transition-all">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white group-hover:-translate-y-1 transition-all shadow-sm">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-medium text-stone-800 mt-2.5 tracking-tight">裝備借測</span>
            </div>

            {/* 分類 3 */}
            <div className="flex flex-col items-center group cursor-pointer p-2 rounded-2xl hover:bg-stone-50 transition-all">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white group-hover:-translate-y-1 transition-all shadow-sm">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-medium text-stone-800 mt-2.5 tracking-tight">機能飲品</span>
            </div>

            {/* 分類 4 */}
            <div className="flex flex-col items-center group cursor-pointer p-2 rounded-2xl hover:bg-stone-50 transition-all">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white group-hover:-translate-y-1 transition-all shadow-sm">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-medium text-stone-800 mt-2.5 tracking-tight">仙台交流</span>
            </div>

            {/* 分類 5 */}
            <div className="flex flex-col items-center group cursor-pointer p-2 rounded-2xl hover:bg-stone-50 transition-all">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white group-hover:-translate-y-1 transition-all shadow-sm">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                  <path strokeLinecap="round" d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-medium text-stone-800 mt-2.5 tracking-tight">打擊體驗</span>
            </div>

            {/* 分類 6 */}
            <div className="flex flex-col items-center group cursor-pointer p-2 rounded-2xl hover:bg-stone-50 transition-all">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-50 border border-[#7A1B28]/15 flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white group-hover:-translate-y-1 transition-all shadow-sm">
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-medium text-stone-800 mt-2.5 tracking-tight">VIP預約</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 門市體驗基地：手機單欄／電腦雙欄大器展現 */}
      <section id="branches" className="max-w-6xl mx-auto px-5 md:px-8 mt-12 md:mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-xl md:text-2xl font-bold text-stone-900">門市據點與交流空間</h2>
            <p className="text-xs md:text-sm text-stone-500 mt-1 font-light">提供預約借測、現場專業手沖與海外交流洽商</p>
          </div>
          <span className="text-xs md:text-sm text-[#7A1B28] font-semibold tracking-wider">
            TAIPEI ✕ SENDAI
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-stone-900 text-base">台北旗艦體驗館</h3>
                <span className="text-[10px] md:text-xs bg-[#7A1B28]/10 text-[#7A1B28] font-bold px-2 py-0.5 rounded">
                  門市基地
                </span>
              </div>
              <p className="text-xs md:text-sm text-stone-500 leading-relaxed font-light mt-1">
                服務時間：週一至週日 08:00 - 21:00<br />
                地址：台北市松山區專屬複合概念館
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-400 font-light">現場無人智能手沖・原廠裝備借測</span>
              <a
                href="https://line.me"
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-stone-900 hover:bg-black text-white px-4 py-2 rounded-xl font-medium transition"
              >
                LINE 台北預約
              </a>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200/70 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-stone-900 text-base">日本仙台交流據點</h3>
                <span className="text-[10px] md:text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                  跨國基地
                </span>
              </div>
              <p className="text-xs md:text-sm text-stone-500 leading-relaxed font-light mt-1">
                服務時間：預約制接待交流<br />
                對接日本少棒名師指導、台日移地訓練與品牌代理
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-400 font-light">海外移地訓交流・裝備採購對接</span>
              <a
                href="https://line.me"
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-[#7A1B28] hover:bg-[#63141f] text-white px-4 py-2 rounded-xl font-medium transition"
              >
                LINE 仙台交流
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 電腦端專屬頁尾（md 以上顯示） */}
      <footer className="hidden md:block bg-stone-900 text-stone-400 py-12 px-8 mt-20 border-t border-stone-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#7A1B28] flex items-center justify-center text-white font-serif font-bold text-sm">
              S
            </div>
            <span className="font-serif tracking-widest text-white font-bold text-base">
              SPORT CAFÉ HUB
            </span>
          </div>
          <div className="flex items-center gap-8 text-xs text-stone-400 font-light">
            <span>台北旗艦館：02-2500-0000</span>
            <span>官方 LINE：@sportcafe</span>
            <span>台日少棒交流基地（Sendai）</span>
          </div>
          <div className="text-xs text-stone-500 font-light">
            © 2026 Sport Café. All rights reserved.
          </div>
        </div>
      </footer>

      {/* 6. 手機端專屬：香檳金吸頂底部導覽列（md 以上自動隱藏，絕不擋電腦畫面） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-[#BA9868] via-[#D8C49F] to-[#B59261] text-white shadow-2xl border-t border-white/20">
        <div className="max-w-md mx-auto h-14 flex items-center divide-x divide-white/25">
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
      <LuxuryResponsiveView />
    </Suspense>
  );
}
