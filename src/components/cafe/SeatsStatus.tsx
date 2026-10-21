import { PlugZap, Sofa, Zap } from "lucide-react";

const SEAT = {
  remaining: 12,
  total: 20,
  outlets: { free: 8, total: 10 },
  focus: "運作中",
} as const;

export default function SeatsStatus() {
  const ratio = Math.round((SEAT.remaining / SEAT.total) * 100);

  return (
    <section id="seats" className="scroll-mt-24">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-wood">LIVE FLOOR</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">即時座位儀表板</h2>
        </div>
        <span className="hidden shrink-0 text-sm text-white/50 lg:inline">
          無人空間即時同步
        </span>
      </div>

      <article className="rounded-3xl border border-white/10 bg-rock p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-pulse/15 text-pulse">
              <Sofa className="size-5" />
            </span>
            <div>
              <p className="text-sm text-white/60">剩餘席位</p>
              <p className="text-3xl font-semibold tracking-tight">
                {SEAT.remaining}
                <span className="text-lg text-white/40">/{SEAT.total}</span>
              </p>
            </div>
          </div>
          <p className="rounded-full bg-status/15 px-3 py-1 text-xs text-status">
            使用率 {100 - ratio}%
          </p>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-rock-soft">
          <div className="h-full rounded-full bg-pulse" style={{ width: `${ratio}%` }} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl bg-rock-soft px-4 py-3">
            <PlugZap className="size-4 text-wood" />
            <div>
              <p className="text-xs text-white/50">插座區</p>
              <p className="text-sm">
                空位 {SEAT.outlets.free}/{SEAT.outlets.total} · 可充電訓練
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-rock-soft px-4 py-3">
            <Zap className="size-4 text-pulse" />
            <div>
              <p className="text-xs text-white/50">專注艙</p>
              <p className="text-sm">靜音區 {SEAT.focus}</p>
            </div>
          </div>
        </div>

        <a
          href="#visit"
          className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-pulse text-sm font-semibold text-white"
        >
          快速預訂席位
        </a>
      </article>
    </section>
  );
}
