import { createClient } from "redis";

export const instant = false;

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.STORAGE_URL ||
  process.env.KV_URL ||
  "";

// 預設配置
const defaultConfig = {
  title: "SPORT CAFÉ",
  announcement: "民安少棒・巨人盃賽事直播中！",
  announcementUrl: "https://youtube.com",
  bannerAnimation: "animate-pulse",
  heroImage: "https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop",
  btnStyle: "bg-[#00B900] hover:bg-[#009900] text-white shadow-md",
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
    <div className="min-h-screen bg-[#FAF7F4] text-stone-800 flex flex-col font-sans relative">
      {/* 跑馬燈動畫 CSS */}
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
      <aside className="bg-[#7A1B28] text-white text-xs sm:text-sm py-2 px-4 text-center overflow-hidden">
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

      {/* 2. 英爵風格頂級導覽列 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 px-6 sm:px-10 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#7A1B28] flex items-center justify-center font-bold text-white text-base shadow-sm">
            S
          </div>
          <span className="font-extrabold tracking-[0.2em] text-xl text-[#7A1B28]">
            {config.title}
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-stone-700 tracking-wider">
          <a href="#about" className="hover:text-[#7A1B28] transition">關於本所</a>
          <a href="#services" className="hover:text-[#7A1B28] transition">服務項目</a>
          <a href="#experts" className="hover:text-[#7A1B28] transition">職人專欄</a>
          <a href="#sharing" className="hover:text-[#7A1B28] transition">美麗見證</a>
          <a href="#gear" className="hover:text-[#7A1B28] transition">裝備專區</a>
          <a href="#prices" className="hover:text-[#7A1B28] transition">參考價目表</a>
          <a href="#stores" className="hover:text-[#7A1B28] transition">診所據點</a>
          <a href="#contact" className="hover:text-[#7A1B28] transition">線上客服</a>
        </nav>

        <div className="flex items-center gap-5">
          <button aria-label="搜尋" className="text-stone-700 hover:text-[#7A1B28] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
            </svg>
          </button>
          <a
            href="https://line.me"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden sm:inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold tracking-wider transition ${config.btnStyle}`}
          >
            <span>LINE 預約</span>
          </a>
          <button aria-label="手機選單" className="lg:hidden text-stone-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* 3. Hero 主視覺 */}
      <main className="flex-1">
        <section
          className="relative h-[520px] sm:h-[600px] flex flex-col justify-end bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${config.heroImage}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          <div className="relative z-10 max-w-7xl w-full mx-auto px-8 pb-16">
            <div className="inline-block px-3.5 py-1 mb-3 rounded bg-[#7A1B28] text-[#F3D299] text-[11px] font-semibold tracking-[0.2em] uppercase">
              SPORT CAFÉ EXCLUSIVE
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-4 leading-tight">
              全國一起為民安少棒加油！
            </h1>
            <p className="text-stone-200 text-sm sm:text-base max-w-xl mb-6 font-light leading-relaxed tracking-wide">
              結合日式極致手沖工藝與專業裝備借測。300天職人匠心淬鍊・專注升級的現代複合空間。
            </p>

            <div className="flex items-center gap-6">
              <a
                href="https://line.me"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-full bg-white text-stone-900 text-xs font-bold tracking-wider hover:bg-stone-100 transition shadow-lg flex items-center gap-2"
              >
                <span>了解專案 ➔</span>
              </a>
            </div>
          </div>
        </section>

        {/* 4. 服務項目區塊 */}
        <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-wide text-[#7A1B28] mb-2">
              Services & Experience.
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm tracking-widest uppercase">
              頂級工藝與專業運動空間配置
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "精品手沖咖啡", desc: "單品產地嚴選，日式手沖慢滴工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" },
              { title: "專業裝備借測", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop" },
              { title: "機能能量飲品", desc: "為運動員與品味人士特調的機能補給。", tag: "ENERGY", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition border border-stone-100 flex flex-col group cursor-pointer">
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-[#7A1B28] tracking-widest">
                    {item.tag}
                  </div>
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-2">{item.title}</h3>
                    <p className="text-xs text-stone-500 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-[#7A1B28]">了解更多 ➔</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 5. 英爵同款右下角互動懸浮客服選單 */}
      <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
        {/* 提示對話氣泡框 */}
        <div className="bg-white/95 backdrop-blur border border-stone-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 text-xs max-w-[240px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-stone-700 leading-snug">
            <strong className="text-[#7A1B28]">LINE 預約</strong> · 或點我來電諮詢詢都可以哦！
          </span>
        </div>

        {/* 懸浮紅酒色按鈕 */}
        <a
          href="https://line.me"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="線上客服與預約"
          className="w-14 h-14 rounded-full bg-[#7A1B28] text-white shadow-2xl flex items-center justify-center hover:scale-105 transition shrink-0 group relative"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </a>
      </div>

      {/* 6. Footer */}
      <footer className="bg-[#EFEAE4] border-t border-stone-300 text-stone-700 py-12 px-8 mt-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#7A1B28] flex items-center justify-center font-bold text-white text-sm">
                S
              </div>
              <span className="font-bold tracking-widest text-lg text-[#7A1B28]">
                SPORT CAFÉ
              </span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              結合日式手沖工藝與專業運動設備借測的頂級複合空間。
            </p>
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm mb-3">台北據點</div>
            <p className="text-xs text-stone-600 mb-1">台北市大安區信義路四段</p>
            <p className="text-xs text-stone-500">電話：02-2700-0000</p>
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm mb-3">仙台交流據點</div>
            <p className="text-xs text-stone-600 mb-1">日本宮城縣仙台市草野塾</p>
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm mb-3">快速預約</div>
            <a
              href="https://line.me"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2 rounded-full bg-[#7A1B28] text-white text-xs font-bold tracking-wider hover:bg-[#63141f] transition"
            >
              LINE 專人預約
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-stone-300/60 pt-6 text-center text-xs text-stone-500">
          <p>© 2026 SPORT CAFÉ GROUP. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
