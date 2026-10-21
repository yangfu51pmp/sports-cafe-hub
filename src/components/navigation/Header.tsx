import { Coffee } from "lucide-react";

const LINKS = [
  { href: "#seats", label: "席位" },
  { href: "#coffee", label: "手沖" },
  { href: "#gear", label: "裝備" },
  { href: "#visit", label: "門市" },
] as const;

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#hero" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-pulse text-white">
            <Coffee className="size-4" strokeWidth={2.2} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-[0.18em]">
              SPORT CAFÉ
            </span>
            <span className="hidden truncate text-[11px] text-wood sm:block">
              無人智能咖啡廳 ✕ 專業運動裝備
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 text-sm text-white/75 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-pulse"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex max-w-[46%] items-center gap-2 rounded-full border border-white/10 bg-rock px-3 py-1.5 sm:max-w-none">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-status opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-status" />
          </span>
          <p className="truncate text-[11px] leading-tight text-white/85 sm:text-xs">
            無人自助手沖運作中
          </p>
        </div>
      </div>
    </header>
  );
}
