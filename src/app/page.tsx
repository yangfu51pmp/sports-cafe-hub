import AnnouncementBar from "@/components/common/AnnouncementBar";
import CoffeeMenu from "@/components/cafe/CoffeeMenu";
import GearShowcase from "@/components/shop/GearShowcase";
import SeatsStatus from "@/components/cafe/SeatsStatus";
import BottomNav from "@/components/navigation/BottomNav";
import Header from "@/components/navigation/Header";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <AnnouncementBar />
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-28 sm:px-6 md:pb-16">
        <section
          id="hero"
          className="hero-grid relative mt-4 flex min-h-[calc(100svh-7.5rem)] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 px-5 py-10 sm:px-10 sm:py-14"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,90,31,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(192,138,84,0.18),transparent_42%)]" />
          <div className="relative max-w-2xl">
            <p className="text-xs tracking-[0.28em] text-pulse">UNMANNED · TRAIN · BREW</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.2] tracking-tight sm:text-5xl lg:text-6xl">
              空間、咖啡
              <span className="block">與你的訓練日常</span>
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-sm leading-7 text-white/65 sm:text-base">
              無人智能咖啡廳與專業運動裝備空間並置。進門自助手沖、借測裝備、坐下恢復，全程即時看板。
            </p>
          </div>
        </section>

        <div className="mt-16 space-y-16">
          <SeatsStatus />
          <CoffeeMenu />
          <GearShowcase />

          <section id="visit" className="scroll-mt-24 rounded-3xl border border-white/10 bg-rock p-6 sm:p-8">
            <p className="text-xs tracking-[0.22em] text-wood">STORE</p>
            <h2 className="mt-1 text-2xl font-semibold">門市導航</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              24 小時感應進出。夜間打擊區採預約制，咖啡吧台全日無人自助運作。
            </p>
            <p className="mt-4 text-sm text-white/80">台北市大安區訓練一路 24 號 · B1–1F</p>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
