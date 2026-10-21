"use client";

import { useEffect, useState } from "react";

const ITEMS = [
  "今日智能手沖限定單品 85 折",
  "夜間自主棒球打擊區已開放預約",
] as const;

function Chip({ text }: { text: string }) {
  return (
    <p className="flex shrink-0 items-center gap-3">
      <span className="inline-block size-1.5 rounded-full bg-pulse" />
      <span className="tracking-wide text-white/90">{text}</span>
      <span className="text-wood">HUB LIVE</span>
    </p>
  );
}

export default function AnnouncementBar() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setRun(true), 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="relative z-50 overflow-hidden border-b border-white/10 bg-rock text-[13px]">
      <div
        className={`flex w-max items-center gap-10 py-2 pr-10 ${
          run ? "animate-marquee" : ""
        }`}
      >
        <Chip text={ITEMS[0]} />
        <Chip text={ITEMS[1]} />
        <Chip text={ITEMS[0]} />
        <Chip text={ITEMS[1]} />
        <Chip text={ITEMS[0]} />
        <Chip text={ITEMS[1]} />
      </div>
    </div>
  );
}
