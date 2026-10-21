import { createClient } from "redis";
import CoffeeMenu from "@/components/cafe/CoffeeMenu";

async function getSiteData() {
  const REDIS_URL = process.env.REDIS_URL || process.env.STORAGE_URL || "";
  let announcement = "歡迎光臨 Sport Cafe！無人智能手沖與專業運動裝備空間。";
  let title = "空間、咖啡與你的訓練日常";

  if (!REDIS_URL) return { announcement, title };

  try {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    const storedNotice = await client.get("site_announcement");
    const storedTitle = await client.get("site_title");
    await client.quit();

    if (storedNotice) announcement = storedNotice;
    if (storedTitle) title = storedTitle;
  } catch (e) {
    console.error("Failed to read Redis:", e);
  }

  return { announcement, title };
}

export default async function Home() {
  const { announcement, title } = await getSiteData();

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      {/* 頂部即時公告橫幅 */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-center text-sm font-medium tracking-wide shadow-md flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>門市公告：{announcement}</span>
      </div>

      {/* Hero 形象展示區 */}
      <section className="relative px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-orange-400 uppercase bg-orange-950/60 border border-orange-500/30 rounded-full">
          Sport Cafe & Training Space
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
          {title}
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-8">
          結合運動體能評估、裝備租借體驗與智能無人手沖咖啡，打造運動員與愛好者的專屬據點。
        </p>

        <div className="flex justify-center gap-4">
          <a
            href="#booking"
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            現場借測預約
          </a>
          <a
            href="#menu"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-gray-200 font-semibold rounded-xl border border-zinc-700 transition-all"
          >
            手沖點餐菜單
          </a>
        </div>
      </section>

      {/* 咖啡菜單組件 */}
      <section id="menu" className="max-w-5xl mx-auto px-6 py-12">
        <CoffeeMenu />
      </section>
    </main>
  );
}
