"use client";

import { useState, useEffect } from "react";

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // 動態綁定 Redis 的網站主標題、頂部公告與連結
  const [siteTitle, setSiteTitle] = useState("");
  const [siteAnnouncement, setSiteAnnouncement] = useState("");
  const [siteAnnouncementUrl, setSiteAnnouncementUrl] = useState("");

  // 動態綁定網站主視覺背景
  const [siteHeroImage, setSiteHeroImage] = useState("https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=1600&auto=format&fit=crop");

  // 動態綁定影片區塊
  const [sitePromoVideo, setSitePromoVideo] = useState("https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-into-a-cup-41545-large.mp4");
  const [sitePromoVideoTitle, setSitePromoVideoTitle] = useState("FEATURED VIDEO ｜ 職人精神 × 少棒熱血應援");
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);

  // 截圖與封面圖模式支援
  const [sitePromoPoster, setSitePromoPoster] = useState("");
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  useEffect(() => {
    // 1. 若網址帶有即時預覽參數，優先同步顯示（確保 LINE 截圖 100% 零延遲拍到最新文字）
    const params = new URLSearchParams(window.location.search);
    const liveTitle = params.get("live_title");
    const liveNotice = params.get("live_notice");
    const liveUrl = params.get("live_url");
    const liveBg = params.get("live_bg");
    const liveVideo = params.get("live_video");
    const liveVideoTitle = params.get("live_video_title");
    const isScreenshot = params.get("screenshot") === "1";
    const livePoster = params.get("live_poster");
    const liveOrientation = params.get("live_orientation");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (liveTitle) setSiteTitle(liveTitle);

    if (liveNotice) setSiteAnnouncement(liveNotice);

    if (liveUrl) setSiteAnnouncementUrl(liveUrl);

    if (liveBg) setSiteHeroImage(liveBg);

    if (liveVideo) setSitePromoVideo(liveVideo);

    if (liveVideoTitle) setSitePromoVideoTitle(liveVideoTitle);

    if (isScreenshot) setIsScreenshotMode(true);

    if (livePoster) setSitePromoPoster(livePoster);

    if (liveOrientation === "vertical") setIsVerticalVideo(true);

    // 2. 向後端 API 讀取 Redis 最新設定
    fetch(`/api/line?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.site_title) setSiteTitle(data.site_title);
        if (data?.site_announcement) setSiteAnnouncement(data.site_announcement);
        if (data?.site_announcement_url) setSiteAnnouncementUrl(data.site_announcement_url);
        if (data?.site_hero_image) setSiteHeroImage(data.site_hero_image);
        if (data?.site_promo_video) setSitePromoVideo(data.site_promo_video);
        if (data?.site_promo_video_title) setSitePromoVideoTitle(data.site_promo_video_title);
        if (data?.site_promo_poster && !livePoster) setSitePromoPoster(data.site_promo_poster);
        if (data?.site_promo_orientation === "vertical" && !liveOrientation) setIsVerticalVideo(true);
      })
      .catch((err) => console.error("讀取網站動態設定失敗:", err));
  }, []);

  // 直接鎖定您在 LINE 指定的 4 大最新服務項目
  const services = [
    { title: "職人精品手沖咖啡", desc: "嚴選莊園單品，極致日式手沖工藝。", tag: "COFFEE", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop" },
    { title: "職人裝備嚴選", desc: "日規打擊配重與高規格球具體驗。", tag: "EQUIPMENT", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop" },
    { title: "專業訓練課程", desc: "為運動員與品味人士特調的機能補給與訓練。", tag: "TRAINING", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop" },
    { title: "台日國際交流", desc: "結合仙台草野塾與台灣少棒的深度交流。", tag: "EXCHANGE", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop" },
  ];

  const pureGoldStyle = "bg-[#C8A878] hover:bg-[#B89868] text-white shadow-md";

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

      {/* 1. 頂部公告欄（動態顯示 Redis 公告與連結） */}
      <aside className="bg-[#7A1B28] text-white text-xs sm:text-sm py-2 px-4 text-center overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-[#F5A623] shrink-0" />
          <a
            href={siteAnnouncementUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium tracking-wide inline-block animate-pulse"
          >
            <span>{siteAnnouncement}</span>
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
              { title: "服務項目", items: ["精品手沖咖啡", "匠心嚴選裝備", "專業訓練課程", "台日國際交流"] },
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

      {/* 4. Hero 主視覺（動態顯示 Redis 主標題） */}
      <main className="flex-1">
        <section
          className="relative h-[520px] sm:h-[600px] flex flex-col justify-end transition-all duration-700 overflow-hidden bg-stone-900"
        >
          {siteHeroImage?.match(/\.(mp4|webm)(\?.*)?$/i) ? (
            <video src={siteHeroImage} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
          ) : (
            <img src={siteHeroImage} alt="Hero Background" className="absolute inset-0 w-full h-full object-cover z-0" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 z-10" />

          <div className="relative z-20 max-w-7xl w-full mx-auto px-8 pb-16">
            <div className={`inline-block px-4 py-1.5 mb-3 rounded-full text-xs font-bold tracking-[0.25em] uppercase ${pureGoldStyle}`}>
              ✦ SPORT CAFÉ EXCLUSIVE ✦
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-4 leading-tight">
              {siteTitle}
            </h1>
            <p className="text-stone-200 text-sm sm:text-base max-w-xl mb-6 font-light leading-relaxed tracking-wide">
              結合日式極致手沖工藝與專業裝備借測。300天職人匠心淬鍊・專注升級的現代複合空間。
            </p>
          </div>
        </section>

        {/* 宣傳影片區塊 */}
        {sitePromoVideo !== "hidden" && (
          <section className="bg-stone-900 py-16 px-6">
            <div className="max-w-5xl mx-auto flex flex-col items-center">
              <div className="inline-block px-3 py-1 mb-4 rounded-full text-[10px] font-bold tracking-widest text-[#C8A97E] border border-[#C8A97E]/40 uppercase">
                {sitePromoVideoTitle}
              </div>

              {(() => {
                const ytMatch = sitePromoVideo.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i);
                if (ytMatch) {
                  const ytId = ytMatch[1];
                  const isShorts = sitePromoVideo.toLowerCase().includes('/shorts/');
                  const ytContainerClass = isShorts
                    ? "max-w-[360px] mx-auto w-full aspect-[9/16] rounded-2xl shadow-2xl border border-[#C8A97E]/30"
                    : "w-full max-w-4xl mx-auto aspect-video rounded-2xl shadow-2xl border border-[#C8A97E]/30";

                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&playsinline=1`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className={ytContainerClass}
                    />
                  );
                } else {
                  const videoClass = isVerticalVideo
                    ? "max-w-[360px] w-full mx-auto aspect-[9/16] object-contain bg-black rounded-2xl shadow-2xl border border-[#C8A97E]/30"
                    : "w-full max-w-4xl mx-auto aspect-video object-contain bg-black rounded-2xl shadow-2xl border border-[#C8A97E]/30";

                  if (isScreenshotMode && sitePromoPoster) {
                    return (
                      <div className={`relative flex items-center justify-center overflow-hidden ${videoClass}`}>
                        <img
                          src={sitePromoPoster}
                          alt="Video Poster"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-lg">
                            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-2"></div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <video
                      key={sitePromoVideo}
                      src={sitePromoVideo}
                      poster={sitePromoPoster || undefined}
                      preload="metadata"
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      onLoadedMetadata={(e) => setIsVerticalVideo(e.currentTarget.videoHeight > e.currentTarget.videoWidth)}
                      className={videoClass}
                    />
                  );
                }
              })()}
            </div>
          </section>
        )}

        {/* 服務項目清單（已完美更新為 4 個項目） */}
        <section id="services" className="max-w-7xl mx-auto px-8 pt-16 pb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-wide text-[#7A1B28] mb-2">
              Services & Experience.
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm tracking-widest uppercase">
              頂級工藝與專業運動空間配置
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((item, idx) => (
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

      {/* 6. 手機底部固定導覽列（純金風格） */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-[52px] bg-white border-t border-stone-200 flex items-stretch shadow-lg md:hidden">
        <a
          href="https://line.me"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold tracking-wider border-r border-white/20 ${pureGoldStyle}`}
        >
          <span>💬 LINE 台北</span>
        </a>
        <a
          href="https://line.me"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold tracking-wider border-r border-white/20 ${pureGoldStyle}`}
        >
          <span>💬 LINE 仙台</span>
        </a>
        <a
          href="tel:0227000000"
          className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold tracking-wider border-r border-white/20 ${pureGoldStyle}`}
        >
          <span>📞 來電諮詢</span>
        </a>
        <button
          onClick={() => setContactOpen(!contactOpen)}
          aria-label="展開"
          className={`w-14 flex items-center justify-center text-xl font-bold ${pureGoldStyle}`}
        >
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
