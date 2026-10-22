import { createClient } from "redis";

export const instant = false;

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.STORAGE_URL ||
  process.env.KV_URL ||
  "";

// 預設配置（完美還原第一張截圖的桌機選單與 6 宮格）
const defaultConfig = {
  title: "SPORT CAFÉ",
  announcement: "民安少棒，巨人盃賽事直播中！",
  announcementUrl: "https://youtube.com",
  bannerAnimation: "animate-pulse",
  heroImage: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop",
  btnStyle: "bg-[#7A1B28] hover:bg-[#63141f] text-white",
};

async function getSiteConfig() {
  if (process.env.NEXT_PHASE === "phase-production-build" || !REDIS_URL) {
    return defaultConfig;
  }

  try {
    const client = createClient({
      url: REDIS_URL,
      socket: { connectTimeout: 3000 },
    });
    await client.connect();
    const [title, announcement, url, heroImg, bannerAnim, btnStyle] = await Promise.all([
      client.get("site_title"),
      client.get("site_announcement"),
      client.get("site_announcement_url"),
      client.get("site_hero_image"),
      client.get("site_banner_animation"),
      client.get("site_btn_style"),
    ]);
    await client.quit();

    return {
      title: title || defaultConfig.title,
      announcement: announcement || defaultConfig.announcement,
      announcementUrl: url || defaultConfig.announcementUrl,
      bannerAnimation: bannerAnim || defaultConfig.bannerAnimation,
      heroImage: heroImg || defaultConfig.heroImage,
      btnStyle: btnStyle || defaultConfig.btnStyle,
    };
  } catch (e) {
    return defaultConfig;
  }
}

export default async function HomePage() {
  const config = await getSiteConfig();

  return (
    <div className="min-h-screen bg-[#F7F4F0] text-stone-800 flex flex-col font-sans pb-14 md:pb-0">
      {/* 左右滑動跑馬燈原生 CSS 動畫 */}
      <style>{`
        @keyframes marqueeSlide {
          0% { transform: translateX(45%); }
          50% { transform: translateX(-45%); }
          100% { transform: translateX(45%); }
        }
        .marquee-slide {
          display: inline-block;
          white-space: nowrap;
          animation: marqueeSlide 9s ease-in-out infinite;
        }
      `}</style>

      {/* 1. 頂部酒紅動態公告欄 */}
      <aside className="bg-[#7A1B28] text-white text-xs sm:text-sm py-2.5 px-4 text-center overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-[#F5A623] shrink-0" />
          <a
            href={config.announcementUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium tracking-wide inline-block ${config.bannerAnimation}`}
          >
            <span>{config.announcement}</span>
            <span className="ml-2 text-[#F3D299] underline underline-offset-4">
              點擊進入直播 ↗
            </span>
          </a>
        </div>
      </aside>

      {/* 2. 第一張截圖同款：高質感寬螢幕導覽列（含完整文字選單與立即預約按鈕） */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-sm">
        {/* 左側 Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#7A1B28] flex items-center justify-center font-bold text-white text-base shadow-sm">
            S
          </div>
          <span className="font-bold tracking-[0.2em] text-xl text-[#7A1B28]">
            {config.title}
          </span>
        </div>

        {/* 中央完整選單（對應第一張圖） */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-700">
          <a href="#services" className="hover:text-[#7A1B28] transition">門市服務</a>
          <a href="#beans" className="hover:text-[#7A1B28] transition">手沖豆單</a>
          <a href="#gear" className="hover:text-[#7A1B28] transition">裝備借測</a>
          <a href="#sendai" className="hover:text-[#7A1B28] transition">仙台交流</a>
          <a href="#stores" className="hover:text-[#7A1B28] transition">門市據點</a>
        </nav>

        {/* 右側搜尋與獨立預約按鈕 */}
        <div className="flex items-center gap-6">
          <button aria-label="搜尋" className="text-stone-700 hover:text-[#7A1B28] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
            </svg>
          </button>
          <a
            href="https://line.me"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden md:inline-block px-6 py-2.5 rounded-full text-xs font-bold tracking-wider transition shadow-sm ${config.btnStyle}`}
          >
            立即預約
          </a>
          <button aria-label="手機選單" className="md:hidden text-stone-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* 3. Hero 主視覺區塊（置左排版＋輪播指示器） */}
      <main className="flex-1">
        <section
          className="relative h-[480px] sm:h-[580px] flex flex-col justify-end bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${config.heroImage}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

          <div className="relative z-10 max-w-6xl w-full mx-auto px-8 pb-14">
            <div className="inline-block px-3 py-1 mb-3 rounded bg-[#7A1B28] text-[#F3D299] text-[11px] font-semibold tracking-[0.18em] uppercase">
              SPORT CAFÉ EXCLUSIVE
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-wide text-white mb-4 leading-tight">
              全國一起為民安少棒加油！
            </h1>
            <p className="text-stone-200 text-sm sm:text-base max-w-xl mb-6 font-normal leading-relaxed tracking-wide">
              結合日式極致手沖工藝與專業裝備借測
              <br />
              300天職人匠心淬鍊・專注升級的現代複合空間
            </p>

            <div className="flex items-center gap-4 text-white/80 text-xs tracking-widest">
              <span className="cursor-pointer hover:text-white">↼ Prev</span>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              </div>
              <span className="cursor-pointer hover:text-white">Next ⇀</span>
            </div>
          </div>
        </section>

        {/* 4. 第一張截圖同款：大器圓角上疊白卡與 6 宮格完整選單 */}
        <section className="relative z-20 -mt-8 bg-[#F7F4F0] rounded-t-[36px] px-6 pt-6 pb-12">
          <div className="max-w-5xl mx-auto bg-white rounded-[32px] px-6 py-10 shadow-[0_10px_40px_rgb(0,0,0,0.05)]">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-6 text-center">
              {/* 1. 精品手沖 */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#FCFAF8] border border-[#F0EAE1] shadow-sm flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zm5-5v2m4-2v2" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-stone-700">精品手沖</span>
              </div>

              {/* 2. 裝備借測 */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#FCFAF8] border border-[#F0EAE1] shadow-sm flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-stone-700">裝備借測</span>
              </div>

              {/* 3. 機能飲品 */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#FCFAF8] border border-[#F0EAE1] shadow-sm flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-stone-700">機能飲品</span>
              </div>

              {/* 4. 仙台交流 */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#FCFAF8] border border-[#F0EAE1] shadow-sm flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-stone-700">仙台交流</span>
              </div>

              {/* 5. 打擊體驗 */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#FCFAF8] border border-[#F0EAE1] shadow-sm flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4m0 8v4M4 12h4m8 0h4" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-stone-700">打擊體驗</span>
              </div>

              {/* 6. VIP預約 */}
              <div className="flex flex-col items-center group cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-[#FCFAF8] border border-[#F0EAE1] shadow-sm flex items-center justify-center text-[#7A1B28] group-hover:bg-[#7A1B28] group-hover:text-white transition mb-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                  </svg>
                </div>
                <span className="text-xs sm:text-sm font-medium text-stone-700">VIP預約</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 5. 右下角浮動智能諮詢對話框 */}
      <div className="fixed bottom-[64px] right-4 z-40">
        <div className="relative bg-[#FAF6F0] border border-[#C5A572] rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#EFE6D8] flex items-center justify-center text-[#A68455] shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H6l-4 4V5z" />
            </svg>
          </div>
          <div className="text-xs leading-snug pr-2">
            <div className="text-stone-600">想知道哪款裝備適合你？</div>
            <div className="font-bold text-[#7A1B28]">點我問問看～</div>
          </div>
          <span className="text-stone-400 text-xs cursor-pointer hover:text-stone-600">✕</span>
        </div>
      </div>

      {/* 6. 手機版底部香檳金固定導覽列 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-[52px] bg-gradient-to-r from-[#C8A878] via-[#BA9868] to-[#B08D5B] text-white flex items-stretch shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:hidden">
        <a
          href="https://line.me"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border-r border-white/25 active:bg-black/10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>LINE 台北</span>
        </a>
        <a
          href="https://line.me"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border-r border-white/25 active:bg-black/10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>LINE 仙台</span>
        </a>
        <a
          href="tel:0227000000"
          className="flex-1 flex items-center justify-center gap-1 text-xs font-medium border-r border-white/25 active:bg-black/10"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>來電諮詢</span>
        </a>
        <button
          aria-label="展開更多"
          className="w-12 flex items-center justify-center text-xl font-light active:bg-black/10"
        >
          ＋
        </button>
      </nav>
    </div>
  );
}
