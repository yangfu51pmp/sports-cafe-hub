import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "redis";
import Navbar from "@/components/layout/Navbar";
import CoffeeMenu from "@/components/cafe/CoffeeMenu";

interface SiteConfig {
  announcement: string;
  title: string;
  curation_left_title: string;
  curation_right_title: string;
  branches: Array<{ name: string; tag: string; hours: string; line_text: string }>;
}

const defaultConfig: SiteConfig = {
  announcement: "歡迎光臨 Sport Café！手沖精品與專業運動裝備借測空間。",
  title: "空間、咖啡與你的訓練日常",
  curation_left_title: "智能無人手沖吧台",
  curation_right_title: "原廠運動裝備借測",
  branches: [
    {
      name: "台北旗艦體驗館",
      tag: "門市基地",
      hours: "週一至週日 08:00 - 21:00",
      line_text: "LINE 台北館 預約諮詢",
    },
    {
      name: "日本仙台交流據點",
      tag: "跨國基地",
      hours: "預約制接待交流",
      line_text: "LINE 仙台交流 預約洽詢",
    },
  ],
};

async function getSiteConfig(): Promise<SiteConfig> {
  await connection();
  const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || process.env.KV_URL || "";
  if (!REDIS_URL) return defaultConfig;

  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const raw = await client.get("site_config_v2");
    await client.quit();
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Redis fetch error:", e);
  }
  return defaultConfig;
}

export default async function Home() {
  const config = await getSiteConfig();

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-stone-800 antialiased selection:bg-[#7A1B28] selection:text-white">
      {/* 1. 頂部細緻公告橫幅 */}
      <div className="bg-[#7A1B28] text-white px-4 py-2 text-center text-xs tracking-widest font-light flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
        <span>門市公告：{config.announcement}</span>
      </div>

      <Navbar />

      {/* 2. Hero 品牌承諾專區 */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="text-[11px] uppercase tracking-[0.3em] text-[#7A1B28] font-semibold border-b border-[#7A1B28]/30 pb-1">
          Sport Café Promises
        </span>
        <h1 className="text-3xl md:text-5xl font-serif text-stone-900 mt-6 mb-4 tracking-tight leading-tight">
          {config.title}
        </h1>
        <p className="text-stone-500 text-sm md:text-base max-w-xl mx-auto leading-relaxed font-light">
          結合日式極致手沖工藝、日規專業運動裝備借測與運動員交流，打造專注升級的現代複合空間。
        </p>

        {/* 3. 雙欄嚴選卡片模組（英爵嚴選版型） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14 text-left">
          {/* 左卡片：智能手沖 */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <span className="text-[10px] font-semibold text-[#7A1B28] uppercase tracking-widest bg-stone-100 px-2.5 py-1 rounded">
                Specialty Coffee
              </span>
              <h3 className="text-xl font-medium text-stone-800 mt-4 mb-2 tracking-wide">
                {config.curation_left_title}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed font-light">
                由微電腦控制精密注水曲線與水溫，提供高蛋白冷萃與運動電解配方，隨時為高強度訓練補充機能。
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-400 font-light">無人吧台・一鍵出杯</span>
              <a href="#menu" className="text-xs font-medium text-[#7A1B28] hover:underline tracking-wide">
                品項菜單 →
              </a>
            </div>
          </div>

          {/* 右卡片：原廠裝備借測 */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <span className="text-[10px] font-semibold text-[#7A1B28] uppercase tracking-widest bg-stone-100 px-2.5 py-1 rounded">
                Professional Gear
              </span>
              <h3 className="text-xl font-medium text-stone-800 mt-4 mb-2 tracking-wide">
                {config.curation_right_title}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed font-light">
                引進日本工藝等級棒壘球手套、碳板專業競速跑鞋與運動數據穿戴裝置，現場提供手感與打擊試接體驗。
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-400 font-light">原廠認證・專業顧問</span>
              <a href="#contact" className="text-xs font-medium text-[#7A1B28] hover:underline tracking-wide">
                借測諮詢 →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 精品手沖菜單模組 */}
      <section id="menu" className="max-w-4xl mx-auto px-6 py-12">
        <CoffeeMenu />
      </section>

      {/* 5. 多據點聯絡我們與 LINE 諮詢（英爵全站共用頁尾） */}
      <footer id="contact" className="bg-white border-t border-stone-200/80 py-16 px-6 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl font-medium text-stone-800 tracking-wide">門市據點與預約諮詢</h2>
            <p className="text-xs text-stone-500 mt-1 font-light">
              提供現場手沖咖啡品嚐、運動裝備借測預約及海外移地交流對接
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {config.branches.map((b, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#FAF9F6] border border-stone-200/80">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-stone-900 text-sm tracking-wide">{b.name}</h3>
                  <span className="text-[10px] bg-stone-200/60 text-stone-600 px-2 py-0.5 rounded">
                    {b.tag}
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed mb-4 font-light">
                  服務時間：{b.hours}
                </p>
                <a
                  href="https://line.me"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block w-full text-center py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-medium text-xs shadow-sm transition tracking-wider"
                >
                  {b.line_text}
                </a>
              </div>
            ))}
          </div>

          <div className="text-center text-[11px] text-stone-400 mt-14 font-light">
            © 2026 Sport Café Hub. All rights reserved.
          </div>
        </div>
      </footer>

      {/* 6. 右下角常駐懸浮 LINE 預約按鈕外掛 */}
      <aside className="fixed bottom-6 right-6 z-40">
        <a
          href="#contact"
          className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-xs font-semibold"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.589-3.843 2.589-5.392z" />
          </svg>
          <span>預約諮詢</span>
        </a>
      </aside>
    </main>
  );
}
