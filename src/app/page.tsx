/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import AiVideoPlayer, { VideoScript } from "@/components/AiVideoPlayer";

export interface ThemeProduct {
  id: string;
  name: string;
  badge: string;
  price: string;
  spec: string;
  img: string;
}

export interface ThemeCategory {
  title: string;
  desc: string;
  tag: string;
  img: string;
  products: ThemeProduct[];
}

const DEFAULT_THEMES: ThemeCategory[] = [
  {
    title: "極致職人手沖咖啡",
    desc: "嚴選莊園單品，極致日式手沖工藝。",
    tag: "COFFEE",
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop",
    products: [
      { id: "c1", name: "衣索比亞 耶加雪菲 日曬 G1", badge: "人氣單品", price: "NT$ 200 / 杯", spec: "淺焙手沖｜馥郁柑橘花香與熱帶水果甜感，尾韻乾淨綿長。", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop" },
      { id: "c2", name: "巴拿馬 翡翠莊園 綠標藝伎 Geisha", badge: "莊園限量", price: "NT$ 450 / 杯", spec: "極致日式點滴手沖｜標誌性茉莉花香、佛手柑與水蜜桃蜜甜韻。", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop" },
      { id: "c3", name: "職人醇厚深焙 濾掛咖啡禮盒 (10入)", badge: "伴手禮首選", price: "NT$ 580 / 盒", spec: "中深焙特調｜黑巧克力與焦糖堅果香氣，居家與球場隨時享受。", img: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=600&auto=format&fit=crop" }
    ]
  },
  {
    title: "職人裝備嚴選",
    desc: "日規打擊配重與高規格球具體驗。",
    tag: "EQUIPMENT",
    img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop",
    products: [
      { id: "e1", name: "日規職人手作 實戰內野手套", badge: "日本牛皮", price: "NT$ 8,800", spec: "日本進口硬式/軟式皮革｜職人刀模定型，極致接球手感與紮實球袋。", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=600&auto=format&fit=crop" },
      { id: "e2", name: "高反發平衡配重 少棒/青少棒打擊棒", badge: "店內可借測", price: "NT$ 6,500", spec: "日規配重設計｜提升揮棒初速與甜蜜點傳導，支援門市實測體驗。", img: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=600&auto=format&fit=crop" },
      { id: "e3", name: "職業級防滑小羊皮打擊手套組", badge: "實戰必備", price: "NT$ 1,680", spec: "高貼合度立體剪裁｜強化手腕包覆與掌心止滑，揮擊不滑手。", img: "https://images.unsplash.com/photo-1562077772-3bd90403f7f0?q=80&w=600&auto=format&fit=crop" }
    ]
  },
  {
    title: "專業訓練課程",
    desc: "為運動員與品味人士特調的機能補給與訓練。",
    tag: "TRAINING",
    img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=800&auto=format&fit=crop",
    products: [
      { id: "t1", name: "日式打擊機制與揮棒軌跡 一對一特訓", badge: "名師指導", price: "NT$ 2,500 / 堂", spec: "60分鐘專項檢測｜結合高速攝影動作分析，精準修正發力順序與擊球仰角。", img: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=600&auto=format&fit=crop" },
      { id: "t2", name: "內野守備步法與傳球協調專項班", badge: "少棒熱銷", price: "NT$ 1,800 / 堂", spec: "下盤重心轉換與接傳流暢度訓練｜建立日本少棒標準基本功。", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?q=80&w=600&auto=format&fit=crop" },
      { id: "t3", name: "運動員賽前機能咖啡＆修復補給套組", badge: "職人特調", price: "NT$ 880 / 組", spec: "專注力提升手沖飲品＋賽後電解質與優質蛋白補給方案。", img: "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=600&auto=format&fit=crop" }
    ]
  },
  {
    title: "台日國際交流",
    desc: "結合仙台草野塾與台灣少棒的深度交流。",
    tag: "EXCHANGE",
    img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=800&auto=format&fit=crop",
    products: [
      { id: "x1", name: "日本東北・仙台草野塾 移地訓練專案", badge: "仙台直通", price: "專案預約諮詢", spec: "前日職名將草野大輔親自指導｜結合日式室內訓練場與在地文化深度體驗。", img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop" },
      { id: "x2", name: "台日少棒友誼交流賽＆家庭應援團", badge: "年度盛事", price: "專案預約諮詢", spec: "安排日本在地少棒強權交流賽、球場參訪、隨團翻譯與專業賽事攝影紀錄。", img: "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=600&auto=format&fit=crop" },
      { id: "x3", name: "日本客座教練來台 球團/校隊包班講習", badge: "團體預約", price: "專案預約諮詢", spec: "引進正統日本棒球訓練課表與觀念講座，提供球隊客製化技術升級。", img: "https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=600&auto=format&fit=crop" }
    ]
  }
];

export default function HomePage() {
  const [themes, setThemes] = useState<ThemeCategory[]>(DEFAULT_THEMES);
  const [activeThemeIndex, setActiveThemeIndex] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string>("");
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
  const [sitePromoVideoDraft, setSitePromoVideoDraft] = useState("");
  const [siteAiVideoScript, setSiteAiVideoScript] = useState<VideoScript | null>(null);
  const [siteAiVideoScriptDraft, setSiteAiVideoScriptDraft] = useState<VideoScript | null>(null);
  const [isPreviewVideo, setIsPreviewVideo] = useState(false);

  // 截圖與封面圖模式支援
  const [sitePromoPoster, setSitePromoPoster] = useState("");
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);

  // Default v6.2 Fallback Script

  const DEFAULT_SCRIPT: VideoScript = {
    title: "SPORT CAFÉ (v6.2 雜誌級)",
    cover: {
      journal: "SPORT CAFÉ JOURNAL",
      date: "2026 職人特輯",
      title: "職人精神 × 少棒熱血應援",
      subtitle: "極致日式手沖工藝與專業裝備",
      stamp: "職人嚴選",
      speaker: "特約教練",
      speakerRole: "GUEST"
    },
    subtitles: [
      { start: 0.0, end: 2.5, text: "探索 SPORT CAFÉ 的極致魅力", highlight: "極致魅力", color: "#FDE047" },
      { start: 2.8, end: 5.5, text: "品味正宗的日式手沖工藝", highlight: "手沖工藝", color: "#38BDF8" },
      { start: 5.8, end: 8.5, text: "親自體驗頂級的職人球具", highlight: "職人球具", color: "#FF6B6B" },
      { start: 8.8, end: 11.5, text: "為您帶來無與倫比的雙重饗宴", highlight: "雙重饗宴", color: "#FDE047" },
      { start: 11.8, end: 14.5, text: "感受運動帶來的無限熱情", highlight: "無限熱情", color: "#38BDF8" },
      { start: 14.8, end: 17.5, text: "提供最好的賽前機能補給", highlight: "機能補給", color: "#FF6B6B" },
      { start: 17.8, end: 20.5, text: "完美結合職人與少棒精神", highlight: "少棒精神", color: "#FDE047" },
      { start: 20.8, end: 23.5, text: "立即前來門市預約體驗吧", highlight: "預約體驗", color: "#38BDF8" },
      { start: 23.8, end: 26.5, text: "給您最高規格的裝備測試", highlight: "裝備測試", color: "#FF6B6B" },
      { start: 26.8, end: 29.5, text: "讓每一次揮擊都充滿自信", highlight: "充滿自信", color: "#FDE047" }
    ],
    events: [
      { start: 3.5, end: 6.5, type: "qa_bubble", badge: "💬 職人 Q&A 解答", title: "日式手沖的秘密?", text: "精準控制水溫與完美點滴萃取技術", position: "top-right", sfx: "none" },
      { start: 7.0, end: 10.0, type: "myth_buster", badge: "❌ 動作迷思破解", title: "裝備無法提升表現?", text: "優質日規球具能有效突破物理極限", position: "top-left", sfx: "none" },
      { start: 10.5, end: 13.5, type: "big_impact", title: "熱血應援", text: "全力支持台灣少棒前進甲子園", position: "bottom-right", sfx: "none" },
      { start: 14.0, end: 17.0, type: "target_focus", title: "專注核心訓練", text: "引進最新日本職棒等級訓練技術", position: "top-right", sfx: "none" },
      { start: 17.5, end: 20.5, type: "numbered_pill", number: "01", title: "專業精準評估", text: "客製化打擊姿勢調整與配重建議", position: "bottom-left", sfx: "none" },
      { start: 21.0, end: 24.0, type: "checklist_card", badge: "✅ 專業檢核重點", title: "品牌核心特色", items: ["日本教練交流", "專業打擊特訓", "獨家機能飲品"], position: "center", sfx: "none" }
    ],
    outro: {
      badge: "SPORT CAFÉ",
      title: "職人手沖 × 少棒殿堂",
      points: ["嚴選莊園頂級手沖", "日規實戰球具借測", "日本移地訓練窗口"],
      signature: "SPORT CAFÉ 專業團隊",
      cta: "💬 立即點擊下方 LINE 預約體驗"
    }
  };


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
    const openTheme = params.get("open_theme");

    if (openTheme !== null) {
      setActiveThemeIndex(Number(openTheme));
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (liveTitle) setSiteTitle(liveTitle);

    if (liveNotice) setSiteAnnouncement(liveNotice);

    if (liveUrl) setSiteAnnouncementUrl(liveUrl);

    if (liveBg) setSiteHeroImage(liveBg);

    if (liveVideo) setSitePromoVideo(liveVideo);

    if (liveVideoTitle) setSitePromoVideoTitle(liveVideoTitle);

    if (isScreenshot) setIsScreenshotMode(true);

    if (livePoster) setSitePromoPoster(livePoster);

    if (liveOrientation) {
      setIsVerticalVideo(liveOrientation === "vertical");
    }

    const isPreview = params.get("preview") === "video";
    setIsPreviewVideo(isPreview);

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
        if (data?.site_promo_orientation && !liveOrientation) {
          setIsVerticalVideo(data.site_promo_orientation === "vertical");
        }
        if (data?.site_promo_video_draft) setSitePromoVideoDraft(data.site_promo_video_draft);
        if (data?.site_ai_video_script) {
          try { setSiteAiVideoScript(typeof data.site_ai_video_script === 'string' ? JSON.parse(data.site_ai_video_script) : data.site_ai_video_script); } catch(e){}
        }
        if (data?.site_ai_video_script_draft) {
          try { setSiteAiVideoScriptDraft(typeof data.site_ai_video_script_draft === 'string' ? JSON.parse(data.site_ai_video_script_draft) : data.site_ai_video_script_draft); } catch(e){}
        }
        if (Array.isArray(data?.site_themes) && data.site_themes.length > 0) {
          setThemes(data.site_themes);
        }
      })
      .catch((err) => console.error("讀取網站動態設定失敗:", err));
  }, []);

  const pureGoldStyle = "bg-[#C8A97E] hover:bg-[#B89868] text-white shadow-md";

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-800 flex flex-col font-sans relative pb-16 md:pb-0">
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
      <aside className="bg-[#6B1D2F] text-white text-xs sm:text-sm py-2 px-4 text-center overflow-hidden">
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
          <div className="w-9 h-9 rounded-full bg-[#6B1D2F] flex items-center justify-center font-bold text-white text-base shadow-sm">
            S
          </div>
          <span className="font-extrabold tracking-[0.2em] text-xl text-[#6B1D2F]">
            SPORT CAFÉ
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-stone-700 tracking-wider">
          <a href="#about" className="hover:text-[#6B1D2F] transition">關於本所</a>
          <a href="#services" className="hover:text-[#6B1D2F] transition">服務項目</a>
          <a href="#experts" className="hover:text-[#6B1D2F] transition">職人專欄</a>
          <a href="#sharing" className="hover:text-[#6B1D2F] transition">美麗見證</a>
          <a href="#gear" className="hover:text-[#6B1D2F] transition">裝備專區</a>
          <a href="#prices" className="hover:text-[#6B1D2F] transition">參考價目表</a>
          <a href="#stores" className="hover:text-[#6B1D2F] transition">診所據點</a>
          <a href="#contact" className="hover:text-[#6B1D2F] transition">線上客服</a>
        </nav>

        <div className="flex items-center gap-5">
          <button aria-label="搜尋" className="text-stone-800 hover:text-[#6B1D2F] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
            </svg>
          </button>
          
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="選單"
            className="text-stone-800 hover:text-[#6B1D2F] transition p-1"
          >
            {menuOpen ? (
              <svg className="w-7 h-7 text-[#6B1D2F]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
          <div className="max-w-md mx-auto bg-[#6B1D2F] text-white py-3 px-6 rounded-lg font-medium text-sm mb-6 shadow-sm">
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
                <div className="flex items-center justify-between cursor-pointer hover:text-[#6B1D2F]">
                  <span>{section.title}</span>
                  <span className="text-xl font-light text-[#6B1D2F]">+</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Hero 主視覺（動態顯示 Redis 主標題） */}
      <main className="flex-1">
        <section
          className="relative h-[520px] sm:h-[600px] flex flex-col justify-end transition-all duration-700 overflow-hidden bg-[#181514]"
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
          <section className="bg-[#181514] py-16 px-6">
            <div className="max-w-5xl mx-auto flex flex-col items-center">
              {isPreviewVideo && (
                <div className="mb-6 w-full max-w-4xl bg-[#6B1D2F] text-white text-center text-sm font-bold py-3 px-4 rounded-xl shadow-lg border border-[#C8A97E]">
                  🎬 SPORT CAFÉ 內部審片室 (v6.2) — 僅內部可見匯出與下載面板，確認無誤請回 LINE 輸入「確認上架影片」
                </div>
              )}

              <div className="inline-block px-3 py-1 mb-4 rounded-full text-[10px] font-bold tracking-widest text-[#C8A97E] border border-[#C8A97E]/40 uppercase">
                {sitePromoVideoTitle}
              </div>

              {(() => {
                const activeVideoUrl = isPreviewVideo ? (sitePromoVideoDraft || sitePromoVideo) : sitePromoVideo;

                const ytMatch = activeVideoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i);
                if (ytMatch) {
                  const ytId = ytMatch[1];
                  const isShorts = activeVideoUrl.toLowerCase().includes('/shorts/');
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
                  if (isScreenshotMode && sitePromoPoster) {
                    const screenshotContainerClass = isVerticalVideo
                      ? "max-w-[360px] mx-auto w-full relative overflow-hidden"
                      : "max-w-4xl mx-auto w-full relative overflow-hidden";

                    return (
                      <div className={screenshotContainerClass}>
                        <img
                          src={sitePromoPoster}
                          alt="Video Poster"
                          onLoad={(e) => setIsVerticalVideo(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)}
                          className="w-full h-auto block rounded-2xl shadow-2xl border border-[#C8A97E]/30"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-2xl">
                          <div className="w-16 h-16 bg-[#C8A97E]/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-lg">
                            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-2"></div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const activeScript = isPreviewVideo ? (siteAiVideoScriptDraft || siteAiVideoScript || DEFAULT_SCRIPT) : (siteAiVideoScript || DEFAULT_SCRIPT);

                  return (
                    <div className="w-full max-w-4xl mx-auto">
                      <AiVideoPlayer
                        videoUrl={activeVideoUrl}
                        posterUrl={sitePromoPoster || undefined}
                        script={activeScript}
                        isPreviewMode={isPreviewVideo}
                        defaultVertical={isVerticalVideo}
                      />
                    </div>
                  );
                }
              })()}
            </div>
          </section>
        )}

        {/* 服務項目清單（已完美更新為 4 個項目） */}
        <section id="services" className="bg-[#FAF7F2] max-w-7xl mx-auto px-8 pt-16 pb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-wide text-[#6B1D2F] mb-2">
              Services & Experience.
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm tracking-widest uppercase">
              頂級工藝與專業運動空間配置
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {themes.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition border border-stone-100 flex flex-col group cursor-pointer"
                onClick={() => setActiveThemeIndex(idx)}
              >
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-[#FAF7F2]/90 backdrop-blur text-[10px] font-bold text-[#6B1D2F] tracking-widest shadow-sm">
                    {item.tag}
                  </div>
                  <div className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-stone-700 tracking-wider shadow-sm">
                    精選 {item.products?.length || 0} 款
                  </div>
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-2">{item.title}</h3>
                    <p className="text-xs text-stone-500 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-center text-xs font-bold text-white bg-[#6B1D2F] hover:bg-[#5a1827] py-2.5 rounded-xl shadow-sm transition">
                    點擊查看主題商品 (v1.0) ➔
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4.5. Second Layer UI: Full-Screen Theme Products Modal */}
        {activeThemeIndex !== null && themes[activeThemeIndex] && (
          <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setActiveThemeIndex(null)}
          >
            <div
              className="bg-[#FAF7F2] w-full max-w-4xl max-h-[86vh] rounded-3xl shadow-2xl border border-[#C8A97E]/40 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#6B1D2F] text-white px-6 py-5 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded-md">
                      {themes[activeThemeIndex].tag}
                    </span>
                    <h3 className="text-lg font-bold tracking-wide">{themes[activeThemeIndex].title}</h3>
                  </div>
                  <p className="text-xs text-white/80">{themes[activeThemeIndex].desc}</p>
                </div>
                <button
                  onClick={() => setActiveThemeIndex(null)}
                  className="text-white hover:text-[#C8A97E] text-sm font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition"
                >
                  ✕ 關閉視窗
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
                <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
                  {themes[activeThemeIndex].products?.map((product, pIdx) => (
                    <div key={pIdx} className="bg-white rounded-2xl shadow-md border border-stone-200 flex flex-col justify-between shrink-0 group">
                      <div className="relative h-44 w-full overflow-hidden rounded-t-2xl shrink-0 bg-stone-100">
                        <img src={product.img.replace('photo-1526676037777-05a232554f77', 'photo-1517701550927-30cf4ba1dba5')} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute top-3 left-3 bg-[#6B1D2F] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                          {product.badge}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-white rounded-b-2xl">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm mb-1">{product.name}</h4>
                          <div className="text-[#C8A97E] font-bold text-sm mb-2">{product.price}</div>
                          <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{product.spec}</p>
                        </div>
                        <button
                          onClick={() => {
                            const msg = `您好！我想詢問或購買 SPORT CAFÉ【${themes[activeThemeIndex].title}】的「${product.name}（${product.price}）」！\n規格說明：${product.spec}`;
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(msg).catch(() => {});
                            }
                            setToastMsg("已複製商品訊息，為您跳轉 LINE！");
                            setTimeout(() => setToastMsg(""), 3000);
                            window.open(`https://line.me/R/msg/text/?${encodeURIComponent(msg)}`, "_blank");
                          }}
                          className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          💬 點此 LINE 詢問／購買 (v1.2)
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!themes[activeThemeIndex].products || themes[activeThemeIndex].products.length === 0) && (
                    <div className="col-span-full py-12 text-center text-stone-500 text-sm flex flex-col items-center gap-3">
                      <span className="text-3xl opacity-50">☕</span>
                      此主題目前尚無專屬商品，敬請期待！
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast 提示 */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-black/80 text-white text-xs font-bold px-6 py-3 rounded-full shadow-2xl backdrop-blur animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* 5. 頂級 Footer */}
      <footer id="stores" className="bg-[#EFEAE4] border-t border-stone-300 text-stone-800 py-12 px-6 sm:px-12 mt-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#6B1D2F] flex items-center justify-center font-bold text-white text-sm">
                S
              </div>
              <span className="font-bold tracking-widest text-lg text-[#6B1D2F]">
                SPORT CAFÉ
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed mb-6">
              ※任何訓練均有其風險，本網站圖文僅供參考，實際狀況須由專業教練進行評估指導而定。
            </p>
          </div>

          <div>
            <div className="font-bold text-stone-900 text-sm mb-4 tracking-wider text-[#6B1D2F]">診所據點</div>
            <div className="space-y-4 text-xs text-stone-600">
              <div>
                <div className="font-bold text-stone-800 mb-0.5">台北南京館</div>
                <div>📍 台北市南京東路三段331號2樓</div>
                <div className="text-[#6B1D2F]">📞 02-77074669</div>
              </div>
            </div>
          </div>

          <div id="contact">
            <div className="font-bold text-stone-900 text-sm mb-4 tracking-wider text-[#6B1D2F]">聯絡我們</div>
            <div className="text-xs text-stone-500 mb-1">諮詢專線</div>
            <div className="text-xl font-serif font-bold text-[#6B1D2F] mb-4">02-77074669</div>
          </div>

          <div>
            <div className="font-bold text-stone-900 text-sm mb-4 tracking-wider text-[#6B1D2F]">快速連結</div>
            <ul className="space-y-2 text-xs text-stone-600">
              <li><a href="#services" className="hover:text-[#6B1D2F] transition">服務項目</a></li>
              <li><a href="#stores" className="hover:text-[#6B1D2F] transition">門診時間</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-stone-300/60 pt-6 text-center text-xs text-stone-500">
          <p>Copyright © 2026 SPORT CAFÉ GROUP. All rights reserved.</p>
        </div>
      </footer>

      {/* 6. 手機底部固定導覽列（純金風格） */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-[52px] bg-[#C8A97E] border-t border-stone-200 flex items-stretch shadow-lg md:hidden">
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
          <div className="text-xs font-bold text-[#6B1D2F] mb-3 pb-2 border-b border-stone-100 flex items-center justify-between">
            <span>快速聯絡與據點</span>
            <span className="cursor-pointer text-stone-400" onClick={() => setContactOpen(false)}>✕</span>
          </div>
          <div className="flex flex-col gap-2.5 text-xs">
            <a href="https://line.me" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-stone-50 text-stone-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>LINE 台北館</span>
            </a>
            <a href="tel:0227000000" className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-stone-50 text-stone-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6B1D2F]" />
              <span>諮詢專線 02-77074669</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
