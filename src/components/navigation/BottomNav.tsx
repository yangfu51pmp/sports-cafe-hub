import { CalendarCheck, Coffee, MapPin, Shirt } from "lucide-react";

const ITEMS = [
  { href: "#seats", label: "預約席位", icon: CalendarCheck },
  { href: "#gear", label: "裝備租借", icon: Shirt },
  { href: "#coffee", label: "手沖點餐", icon: Coffee },
  { href: "#visit", label: "門市導航", icon: MapPin },
] as const;

export default function BottomNav() {
  return (
    <nav
      aria-label="手機快捷選單"
      className="fixed inset-x-3 bottom-3 z-50 md:hidden"
    >
      <ul className="grid grid-cols-4 rounded-2xl border border-white/10 bg-rock/95 pb-safe pt-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className="flex flex-col items-center gap-1 px-1 py-1.5 text-[11px] text-white/80"
              >
                <Icon className="size-5 text-pulse" strokeWidth={1.8} />
                <span className="leading-none">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
