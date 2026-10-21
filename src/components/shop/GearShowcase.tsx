import { Dumbbell, Footprints, Hand } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Gear = {
  id: string;
  name: string;
  note: string;
  price: string;
  icon: LucideIcon;
};

const GEAR: Gear[] = [
  {
    id: "glove",
    name: "訓練手套",
    note: "防滑掌墊，適合自主重訓與打擊預備。",
    price: "NT$ 1,280",
    icon: Hand,
  },
  {
    id: "shoe",
    name: "競速跑鞋",
    note: "輕量中底，店內跑道可現場借測配速。",
    price: "NT$ 4,260",
    icon: Footprints,
  },
  {
    id: "band",
    name: "阻力帶組",
    note: "三段張力，熱身、修復與核心訓練通用。",
    price: "NT$ 890",
    icon: Dumbbell,
  },
];

export default function GearShowcase() {
  return (
    <section id="gear" className="scroll-mt-24">
      <p className="text-xs tracking-[0.22em] text-wood">FIELD TEST</p>
      <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">運動裝備體驗區</h2>
      <p className="mt-2 max-w-xl text-sm text-white/55">
        熱門裝備可現場借測，或直接線上帶走下一堂訓練。
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GEAR.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.id}
              className="flex flex-col rounded-3xl border border-white/10 bg-rock p-5"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-wood/15 text-wood">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{item.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-white/60">{item.note}</p>
              <p className="mt-4 text-sm text-pulse">{item.price}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-10 rounded-xl border border-white/15 text-sm text-white/90"
                >
                  現場借測
                </button>
                <button
                  type="button"
                  className="h-10 rounded-xl bg-pulse text-sm font-medium text-white"
                >
                  線上購買
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
