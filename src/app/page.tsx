"use client";

import { useState } from "react";

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // 直接鎖定高質感香檳金漸層樣式
  const goldGradientStyle = "bg-gradient-to-r from-[#D4AF37] via-[#AA771C] to-[#8C6213] text-white shadow-md";

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-stone-800 flex flex-col font-sans relative pb-16 md:pb-0">
      <style>{`
        @keyframes marqueeSlide {
          0% { transform: translateX(45%); }
          50% { transform: translateX(-45%); }
          100% { transform: translateX(45%); }
        }
        .marquee-slide {
          display: inline-block;
          white-space: nowrap;
          animation: marqueeSlide 9s ease-in-out infinite;
        }
      `}</style>

      {/* 1. 頂部公告欄 */}
      <aside className="bg-[#7A1B28] text-white text-xs sm:text-sm py-2 px-4 text-center overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-[#F5A623] shrink-0" />
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium tracking-wide inline-block animate-pulse"
          >
            <span>民安少棒・巨人盃賽事直播中！</span>
            <span className="ml-2 text-[#F3D299] underline underline-offset-4">
              點擊進入直播 ↗
            </span>
          </a>
        </div>
      </aside>

      {/* 2. 頂部導覽列 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 px-6 sm:px-10 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#7A1B28] flex items-center justify-center font-bold text-white text-base shadow-sm">
            S
          </div>
          <span className="font-extrabold tracking-[0.2em] text-xl text-[#7A1B28]">
            SPORT CAFÉ
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-stone-700 tracking-wider">
          <a href="#about" className="hover:text-[#7A1B28] transition">關於本所</a>
          <a href="#services" className="hover:text-[#7A1B28] transition">服務項目</a>
          <a href="#experts" className="hover:text-[#7A1B28] transition">職人專欄</a>
          <a href="#sharing" className="hover:text-[#7A1B28] transition">美麗見證</a>
          <a href="#gear" className="hover:text-[#7A1B28] transition">裝備專區</a>
          <a href="#prices" className="hover:text-[#7A1B28] transition">參考價目表</a>
          <a href="#stores" className="hover:text-[#7A1B28] transition">診所據點</a>
          <a href="#contact" className="hover:text-[#7A1B28] transition">線上客服</a>
        </nav>

        <div className="flex items-center gap-5">
          <button aria-label="搜尋" className="text-stone-700 hover:text-[#7A1B28] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
            </svg>
          </button>
          
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="選單"
            className="text-stone-800 hover:text-[#7A1B28] transition p-1"
          >
            {menuOpen ? (
              <svg className="w-7 h-7 text-[#7A1B28]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* 3. 全螢幕漢堡分類選單 */}
      {menuOpen && (
        <div className="fixed inset-0 top-[110px] bg-white z-40 overflow-y-auto px-6 py-8 shadow-2xl">
          <div className="max-w-md mx-auto bg-[#7A1B28] text-white py-3 px-6 rounded-lg font-medium text-sm mb-6 shadow-sm">
            WBEAUTY · SPORT CAFÉ 專屬選單
          </div>
          <div className="max-w-md mx-auto divide-y divide-stone-100 text-stone-800 text-base font-medium">
            {[
              { title: "關於本所", items: ["品牌初心", "創辦理念", "環境導覽"] },
              { title: "服務項目", items: ["精品手沖咖啡", "專業裝備借測", "機能能量飲品", "仙台少棒交流"] },
              { title: "職人專欄", items: ["教練專訪", "裝備評測心得"] },
              { title: "美麗見證", items: ["學員實績分享", "活動花絮"] },
              { title: "參考價目表", items: ["咖啡飲品價目", "裝備借測方案"] },
              { title: "診所據點", items: ["台北信義館", "新竹竹北館"] },
              { title: "線上客服", items: ["專人 LINE 諮詢", "來電預約專線"] },
            ].map((section, idx) => (
              <div key={idx} className="py-4 flex flex-col gap-2">
                <div className="flex items-center justify-between cursor-pointer hover:text-[#7A1B28]">
                  <span>{section.title}</span>
                  <span className="text-xl font-light text-[#7A1B28]">+</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Hero 主視覺 */}
      <main className="flex-1">
        <section
          className="relative h-[520px] sm:h-[600px] flex flex-col justify-end bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          <div className="relative z-10 max-w-7xl w-full mx-auto px-8 pb-16">
            {/* 這裡套用強制鎖定的香檳金漸層樣式 */}
            <div className={`inline-block px-4 py-1.5 mb-3 rounded-full text-xs font-bold tracking-[0.25em] uppercase ${goldGradientStyle}`}>
              ✦ SPORT CAFÉ EXCLUSIVE ✦
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-4 leading-tight">
              全國一起為民安少棒加油！
            </h1>
            <p className="text-stone-200 text-sm sm:text-base max-w-xl mb-6 font-light leading-relaxed tracking-wide">
              結合日式極致手沖工藝與專業裝備借測。300天職人匠心淬鍊・專注升級的現代複合空間。
            </p>
          </div>
        </section>

        {/* 服務項目精選 */}
        <section className="max-w-7xl mx-auto px-8 pt-16 pb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-wide text-[#7A1B28] mb-2">
              Services & Experience.
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm tracking-widest uppercase">
              頂級工藝與專業運動空間配置
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "精品手沖咖啡", desc: "單品產地嚴選，日式手沖慢滴工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" },
              { title: "專業裝備借測", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop" },
              { title: "機能能量飲品", desc: "為運動員與品味人士特調的機能補給。", tag: "ENERGY", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition border border-stone-100 flex flex-col group cursor-pointer">
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-[#7A1B28] tracking-widest">
                    {item.tag}
                  </div>
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-2">{item.title}</h3>
                    <p className="text-xs text-stone-500 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-[#7A1B28]">了解更多 ➔</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 5. 頂級 Footer */}
      <footer id="stores" className="bg-[#EFEAE4] border-t border-stone-300 text-stone-800 py-12 px-6 sm:px-12 mt-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#7A1B28] flex items-center justify-center font-bold text-white text-sm">
                S
              </div>
              <span className="font-bold tracking-widest text-lg text-[#7A1B28]">
                SPORT CAFÉ
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed mb-6">
              ※任何訓練均有其風險，本網站圖文僅供參考，實際狀況須由專業教練進行評估指導而定。
            </p>
          </div>

          <div>
            <div className="font-bold text-stone-900 text-sm mb-4 tracking-wider text-[#7A1B28]">診所據點</div>
            <div className="space-y-4 text-xs text-stone-600">
              <div>
                <div className="font-bold text-stone-800 mb-0.5">台北南京館</div>
                <div>📍 台北市南京東路三段331號2樓</div>
                <div className="text-[#7A1B28]">📞 02-77074669</div>
              </div>
            </div>
          </div>

          <div id="contact">
            <div className="font-bold text-stone-900 text-sm mb-4 tracking-wider text-[#7A1B28]">聯絡我們</div>
            <div className="text-xs text-stone-500 mb-1">諮詢專線</div>
            <div className="text-xl font-serif font-bold text-[#7A1B28] mb-4">02-77074669</div>
          </div>

          <div>
            <div className="font-bold text-stone-900 text-sm mb-4 tracking-wider text-[#7A1B28]">快速連結</div>
            <ul className="space-y-2 text-xs text-stone-600">
              <li><a href="#services" className="hover:text-[#7A1B28] transition">服務項目</a></li>
              <li><a href="#stores" className="hover:text-[#7A1B28] transition">門診時間</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-stone-300/60 pt-6 text-center text-xs text-stone-500">
          <p>Copyright © 2026 SPORT CAFÉ GROUP. All rights reserved.</p>
        </div>
      </footer>

      {/* 6. 手機底部固定導覽列 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-[52px] bg-white border-t border-stone-200 flex items-stretch shadow-lg md:hidden">
        <a href="https://line.me" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 bg-[#1B8A3E] text-white text-xs font-bold tracking-wider border-r border-white/20">
          <span>💬 LINE 台北</span>
        </a>
        <a href="https://line.me" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 bg-[#1B8A3E] text-white text-xs font-bold tracking-wider border-r border-stone-300">
          <span>💬 LINE 仙台</span>
        </a>
        <a href="tel:0227000000" className="flex-1 flex items-center justify-center gap-1 bg-white text-[#7A1B28] text-xs font-bold tracking-wider border-r border-stone-200">
          <span>📞 來電諮詢</span>
        </a>
        <button onClick={() => setContactOpen(!contactOpen)} aria-label="展開" className="w-14 flex items-center justify-center bg-white text-[#7A1B28] text-xl font-bold">
          {contactOpen ? "✕" : "＋"}
        </button>
      </nav>

      {/* 7. 右下角彈出選單 */}
      {contactOpen && (
        <div className="fixed bottom-[60px] right-3 z-50 bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 w-[270px]">
          <div className="text-xs font-bold text-[#7A1B28] mb-3 pb-2 border-b border-stone-100 flex items-center justify-between">
            <span>快速聯絡與據點</span>
            <span className="cursor-pointer text-stone-400" onClick={() => setContactOpen(false)}>✕</span>
          </div>
          <div className="flex flex-col gap-2.5 text-xs">
            <a href="https://line.me" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-stone-50 text-stone-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>LINE 台北館</span>
            </a>
            <a href="tel:0227000000" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-stone-50 text-stone-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7A1B28]" />
              <span>諮詢專線 02-77074669</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
