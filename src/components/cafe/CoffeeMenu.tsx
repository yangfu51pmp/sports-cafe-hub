"use client";

import { useMemo, useState } from "react";

type Category = "all" | "pour-over" | "functional";

type Drink = {
  id: string;
  name: string;
  desc: string;
  price: string;
  category: Exclude<Category, "all">;
};

const FILTERS: { id: Category; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "pour-over", label: "智能手沖" },
  { id: "functional", label: "機能飲品" },
];

const DRINKS: Drink[] = [
  {
    id: "protein",
    name: "高蛋白咖啡",
    desc: "冷萃基底 × 乳清，訓練前後都順口。",
    price: "NT$ 180",
    category: "functional",
  },
  {
    id: "single",
    name: "單品手沖",
    desc: "今日智能手沖限定，機器精準萃取 85 折。",
    price: "NT$ 160",
    category: "pour-over",
  },
  {
    id: "ethiopia",
    name: "衣索比亞淺焙",
    desc: "茉莉與柑橘調，無人吧台一鍵出杯。",
    price: "NT$ 170",
    category: "pour-over",
  },
  {
    id: "electro",
    name: "電解質美式",
    desc: "低糖礦鹽配方，恢復期補水不膩口。",
    price: "NT$ 150",
    category: "functional",
  },
];

export default function CoffeeMenu() {
  const [filter, setFilter] = useState<Category>("all");
  const list = useMemo(
    () =>
      filter === "all" ? DRINKS : DRINKS.filter((drink) => drink.category === filter),
    [filter],
  );

  return (
    <section id="coffee" className="scroll-mt-24">
      <p className="text-xs tracking-[0.22em] text-wood">POUR OVER</p>
      <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">智能手沖與機能飲品</h2>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => {
          const active = item.id === filter;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm ${
                active ? "bg-pulse text-white" : "bg-rock text-white/70"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-5 space-y-3">
        {list.map((drink) => (
          <li
            key={drink.id}
            className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-rock px-4 py-4 sm:px-5"
          >
            <div className="min-w-0">
              <p className="font-medium">{drink.name}</p>
              <p className="mt-1 text-sm leading-6 text-white/55">{drink.desc}</p>
            </div>
            <p className="shrink-0 text-sm text-pulse">{drink.price}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
