import Link from "next/link";
import { createClient } from "redis";

export const dynamic = "force-dynamic";

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.STORAGE_URL ||
  process.env.KV_URL ||
  "";

// 取得 Redis 動態視覺與內容設定
async function getSiteConfig() {
  const defaultConfig = {
    title: "SPORT CAFÉ",
    announcement: "民安少棒・巨人盃賽事直播中！",
    announcementUrl: "https://youtube.com",
    // 預設跑馬燈動態（支援 animate-bounce、animate-pulse 等）
    bannerAnimation: "animate-pulse",
    // 預設首頁背景圖（經典黑咖啡特寫）
    heroImage: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1600&auto=format&fit=crop",
    // 預設門市預約按鈕樣式
    btnStyle: "bg-[#06C755] hover:bg-[#05b34c] md:bg-[#06C755] md:hover:bg-[#05b34c]",
  };

  if (!REDIS_URL) return defaultConfig;

  try {
    const client = createClient({ url: REDIS_URL });
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
    console.error("Redis 讀取失敗，使用預設配置:", e);
    return defaultConfig;
  }
}

export default async function HomePage() {
  const config = await getSiteConfig();

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans">
      {/* 頂部動態公告欄（支援上下跳動、呼吸閃爍、跑馬燈） */}
      <aside className="bg-amber-950/80 border-b border-amber-900/50 text-amber-200 text-xs sm:text-sm py-2 px-4 text-center overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
          <a
            href={config.announcementUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium tracking-wide hover:underline inline-block ${config.bannerAnimation}`}
          >
            {config.announcement}
            <span className="ml-1 opacity-75">點擊前往 ↗</span>
          </a>
        </div>
      </aside>

      {/* 品牌導航列 */}
      <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#BA9868] flex items-center justify-center font-bold text-stone-950 text-base">
            S
          </div>
          <span className="font-extrabold tracking-widest text-lg sm:text-xl text-stone-100">
            {config.title}
          </span>
        </div>
        <div className="flex items-center gap-4 text-stone-400">
          <button className="hover:text-stone-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Hero 視覺核心（動態背景圖） */}
      <main className="flex-1">
        <section
          className="relative min-h-[520px] md:min-h-[620px] flex items-center justify-center bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${config.heroImage}')` }}
        >
          {/* 高質感漸層遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/40" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold tracking-wider uppercase">
              SPORT CAFÉ EXCLUSIVE
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              全國一起為民安少棒加油！
            </h1>
            <p className="text-stone-300 text-sm sm:text-lg max-w-2xl mx-auto mb-8 font-light leading-relaxed">
              結合日式極致手沖工藝與專業裝備借測。300天職人心得淬鍊，專注升級的現代複合空間。
            </p>

            {/* 門市體驗據點雙按鈕 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a
                href="https://line.me"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${config.btnStyle}`}
              >
                <span>LINE 台北預約</span>
              </a>
              <a
                href="https://line.me"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${config.btnStyle}`}
              >
                <span>LINE 仙台交流</span>
              </a>
            </div>
          </div>
        </section>

        {/* 門市服務四格專區 */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { title: "精品手沖", desc: "單品產地嚴選", icon: "☕" },
              { title: "裝備借測", desc: "日規打擊配重", icon: "⚾" },
              { title: "機能飲品", desc: "運動能量特調", icon: "⚡" },
              { title: "仙台交流", desc: "草野塾台日連線", icon: "🌐" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-stone-800/50 border border-stone-700/50 rounded-2xl p-6 text-center hover:bg-stone-800 transition"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="font-bold text-stone-100 mb-1">{item.title}</div>
                <div className="text-xs text-stone-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 底部資訊 */}
      <footer className="border-t border-stone-800 bg-stone-950 py-8 px-6 text-center text-xs text-stone-500">
        <p>© 2026 SPORT CAFÉ GROUP. All rights reserved.</p>
      </footer>
    </div>
  );
}
