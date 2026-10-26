/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

export interface CoverSpec {
  journal?: string;
  date?: string;
  title: string;
  subtitle?: string;
  stamp?: string;
  speaker?: string;
  speakerRole?: string;
}

export interface SubtitleItem {
  start: number;
  end: number;
  text: string;
  highlight?: string;
  color?: string;
}

export interface VideoEventItem {
  start: number;
  end: number;
  type: "qa_bubble" | "myth_buster" | "big_impact" | "target_focus" | "numbered_pill" | "icon_pill" | "warning_tape" | "progress_card" | "checklist_card";
  title?: string;
  subtitle?: string;
  text?: string;
  badge?: string;
  icon?: string;
  number?: string;
  progress?: number;
  items?: string[];
  position?: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
  sfx?: "none";
}

export interface OutroSpec {
  badge?: string;
  title: string;
  points: string[];
  signature?: string;
  cta?: string;
}

export interface VideoScript {
  title?: string;
  cover?: CoverSpec;
  subtitles?: SubtitleItem[];
  events?: VideoEventItem[];
  outro?: OutroSpec;
}

declare global {
  interface Window {
    __isExporting?: boolean;
  }
}

export interface AiVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
  script?: VideoScript | null;
  isPreviewMode?: boolean;
  defaultVertical?: boolean;
}

export default function AiVideoPlayer({ videoUrl, posterUrl, script, isPreviewMode = false, defaultVertical = false }: AiVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rawAudioBufferRef = useRef<ArrayBuffer | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRotated, setIsRotated] = useState<boolean>(false);
  const [isVertical, setIsVertical] = useState<boolean>(defaultVertical);

  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedFile, setExportedFile] = useState<File | null>(null);

  useEffect(() => {
    setIsVertical(defaultVertical);
  }, [defaultVertical]);

  useEffect(() => {
    // 1. Fetch video array buffer in background
    fetch(videoUrl)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        rawAudioBufferRef.current = buffer;
      })
      .catch(console.error);
  }, [videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setIsVertical(videoRef.current.videoHeight > videoRef.current.videoWidth);

      // Scale script timing if video is long
      if (dur > 12 && script) {
        const lastCardEnd = script.events && script.events.length > 0
          ? Math.max(...script.events.map((e) => e.end))
          : (script.subtitles && script.subtitles.length > 0 ? Math.max(...script.subtitles.map((s) => s.end)) : 0);

        if (lastCardEnd < dur - 4) {
          const contentStart = 3.3;
          const contentEnd = dur - 3.6;
          const originalDuration = lastCardEnd - contentStart;
          const newDuration = contentEnd - contentStart;
          const scaleRatio = newDuration / (originalDuration || 1);

          if (script.subtitles) {
            script.subtitles = script.subtitles.map(sub => {
              if (sub.start >= contentStart) {
                return {
                  ...sub,
                  start: contentStart + (sub.start - contentStart) * scaleRatio,
                  end: contentStart + (sub.end - contentStart) * scaleRatio
                };
              }
              return sub;
            });
          }
          if (script.events) {
            script.events = script.events.map(ev => {
              if (ev.start >= contentStart) {
                return {
                  ...ev,
                  start: contentStart + (ev.start - contentStart) * scaleRatio,
                  end: contentStart + (ev.end - contentStart) * scaleRatio
                };
              }
              return ev;
            });
          }
        }
      }
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Fullscreen error", err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Exit fullscreen error", err);
      }
    }
  };

  const toggleRotate = () => {
    setIsRotated(!isRotated);
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setIsRotated(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Sync isPlaying state
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("ended", onEnded);
    return () => {
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("pause", onPause);
      vid.removeEventListener("ended", onEnded);
    };
  }, []);

  // HTML Overlay rendering
  const renderOverlays = () => {
    if (!script) return null;

    const t = currentTime;
    const dur = duration || 0.1;

    // Anti-Overlap Engine
    const isCoverActive = t >= 0 && t <= 3.2;
    const isOutroActive = dur > 5 && t >= dur - 3.5;

    const lockEvents = isCoverActive || isOutroActive;

    // Check if any large card is active
    let activeLargeCard = false;
    const activeEvents = script.events?.filter(e => t >= e.start && t <= e.end) || [];

    if (!lockEvents) {
      for (const ev of activeEvents) {
        if (["qa_bubble", "myth_buster", "big_impact", "progress_card", "checklist_card"].includes(ev.type)) {
          activeLargeCard = true;
          break;
        }
      }
    }

    const currentSub = script.subtitles?.find(s => t >= s.start && t <= s.end);

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 font-sans">
        {/* Cover */}
        {isCoverActive && script.cover && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 bg-black/40 animate-fade-in">
            {script.cover.journal && (
              <div className="inline-block bg-[#C8A97E] text-white px-4 py-1.5 text-xs font-bold tracking-[0.2em] rounded-full shadow-lg shrink-0 mt-6">
                {script.cover.journal} {script.cover.date ? `| ${script.cover.date}` : ''}
              </div>
            )}

            <div className="bg-[rgba(15,23,42,0.92)] border-2 border-[#C8A97E] rounded-2xl p-6 w-full max-w-sm shadow-2xl relative shrink-0">
              {script.cover.stamp && (
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#6B1D2F] rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#C8A97E] transform rotate-12 shadow-lg z-10">
                  {script.cover.stamp}
                </div>
              )}

              <h1 className="text-white text-2xl font-bold leading-snug mb-3 text-center" style={{ fontWeight: 700 }}>
                {script.cover.title}
              </h1>

              {script.cover.subtitle && (
                <p className="text-[#C8A97E] text-sm font-bold text-center mt-2 border-t border-white/20 pt-3" style={{ fontWeight: 600 }}>
                  {script.cover.subtitle}
                </p>
              )}
            </div>

            {script.cover.speaker && (
              <div className="bg-white/95 rounded-lg px-4 py-2 shadow-xl border-l-4 border-[#6B1D2F] flex flex-col self-start shrink-0 mb-6">
                <span className="text-[#6B1D2F] text-[10px] font-bold tracking-wider uppercase mb-0.5">{script.cover.speakerRole || 'GUEST'}</span>
                <span className="text-stone-900 text-base font-bold">{script.cover.speaker}</span>
              </div>
            )}
          </div>
        )}

        {/* Subtitles */}
        {!isCoverActive && !isOutroActive && currentSub && (
          <div className="absolute bottom-6 w-full px-4 flex justify-center z-20 transition-all duration-300">
            <div className="bg-[rgba(15,23,42,0.85)] backdrop-blur-sm rounded-full px-6 py-2.5 max-w-[90%] text-center shadow-lg border border-white/10">
              <p className="text-white text-base md:text-lg font-bold tracking-wide drop-shadow-md" style={{ fontWeight: 700 }}>
                {currentSub.highlight ? (
                  currentSub.text.split(currentSub.highlight).map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="mx-1" style={{ color: currentSub.color || "#FDE047" }}>{currentSub.highlight}</span>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  currentSub.text
                )}
              </p>
            </div>
          </div>
        )}

        {/* Events */}
        {!lockEvents && activeEvents.map((ev, idx) => {
          // Anti-overlap: hide small pills if large card is active
          if (activeLargeCard && ["numbered_pill", "icon_pill", "target_focus", "warning_tape"].includes(ev.type)) {
            return null;
          }

          const posClass =
            ev.position === "top-left" ? "top-4 left-4" :
            ev.position === "top-right" ? "top-4 right-4" :
            ev.position === "bottom-left" ? "bottom-20 left-4" :
            ev.position === "bottom-right" ? "bottom-20 right-4" :
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";

          if (ev.type === "qa_bubble") {
            return (
              <div key={idx} className={`absolute ${posClass} bg-[rgba(255,255,255,0.98)] rounded-2xl p-4 shadow-2xl max-w-[260px] border-l-4 border-[#38BDF8] animate-fade-in`}>
                <div className="text-[#38BDF8] text-xs font-bold mb-1 uppercase tracking-wider">{ev.badge || "Q&A"}</div>
                <div className="text-stone-900 text-sm font-bold" style={{ fontWeight: 700 }}>{ev.title || ev.text}</div>
              </div>
            );
          }

          if (ev.type === "myth_buster") {
            return (
              <div key={idx} className={`absolute ${posClass} bg-[rgba(15,23,42,0.92)] rounded-2xl p-4 shadow-2xl max-w-[260px] border border-[#FF6B6B]/30 animate-fade-in`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-[#FF6B6B] flex items-center justify-center text-white text-xs font-bold">!</span>
                  <span className="text-[#FF6B6B] text-xs font-bold tracking-widest uppercase">MYTH BUSTED</span>
                </div>
                <div className="text-white text-sm font-bold line-through opacity-70 mb-1">{ev.subtitle}</div>
                <div className="text-white text-base font-bold text-[#FDE047]" style={{ fontWeight: 700 }}>{ev.title}</div>
              </div>
            );
          }

          if (ev.type === "progress_card" || ev.type === "checklist_card") {
            return (
              <div key={idx} className={`absolute ${posClass} bg-[rgba(255,255,255,0.98)] rounded-2xl p-5 shadow-2xl max-w-[280px] border-t-4 border-[#10B981] animate-fade-in`}>
                <div className="text-[#10B981] text-xs font-bold mb-3 uppercase tracking-wider">{ev.title}</div>
                {ev.items && (
                  <div className="space-y-2">
                    {ev.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#10B981]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                        </div>
                        <div className="text-stone-800 text-sm font-bold leading-tight" style={{ fontWeight: 700 }}>{item}</div>
                      </div>
                    ))}
                  </div>
                )}
                {ev.progress !== undefined && (
                  <div className="mt-4">
                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#10B981] h-full rounded-full transition-all duration-1000" style={{ width: `${ev.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (ev.type === "numbered_pill") {
            return (
              <div key={idx} className={`absolute ${posClass} bg-[rgba(15,23,42,0.92)] text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-fade-in border border-white/20`}>
                <span className="w-5 h-5 rounded-full bg-[#FDE047] text-[rgba(15,23,42,1)] flex items-center justify-center text-xs font-bold">{ev.number}</span>
                <span className="text-sm font-bold" style={{ fontWeight: 700 }}>{ev.text}</span>
              </div>
            );
          }

          if (ev.type === "target_focus") {
            return (
              <div key={idx} className={`absolute ${posClass} bg-transparent animate-pulse flex items-center justify-center`}>
                 <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#FF6B6B] animate-spin-slow"></div>
                 <div className="absolute w-2 h-2 bg-[#FF6B6B] rounded-full"></div>
                 {ev.text && <div className="absolute top-20 bg-[rgba(15,23,42,0.9)] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">{ev.text}</div>}
              </div>
            );
          }

          return null;
        })}

        {/* Outro */}
        {isOutroActive && script.outro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-[rgba(15,23,42,0.95)] border-2 border-[#C8A97E] rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
              {script.outro.badge && (
                <div className="absolute top-0 left-0 w-full bg-[#6B1D2F] text-white text-center text-[10px] font-bold tracking-widest py-1.5">
                  {script.outro.badge}
                </div>
              )}

              <h2 className="text-white text-xl md:text-2xl font-bold text-center mt-4 mb-5" style={{ fontWeight: 700 }}>
                {script.outro.title}
              </h2>

              <div className="space-y-3 mb-6">
                {script.outro.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[#C8A97E] font-bold text-lg leading-none mt-0.5">•</span>
                    <p className="text-stone-200 text-sm md:text-base font-bold leading-snug" style={{ fontWeight: 600 }}>{pt}</p>
                  </div>
                ))}
              </div>

              {script.outro.signature && (
                <div className="text-center text-[#C8A97E] text-sm font-bold italic border-t border-white/10 pt-4" style={{ fontWeight: 600 }}>
                  {script.outro.signature}
                </div>
              )}
            </div>

            {script.outro.cta && (
              <div className="mt-6 bg-[#06C755] text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl animate-bounce flex items-center gap-2">
                <span>💬</span> {script.outro.cta}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Canvas drawing for MP4 export
  const drawOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dur: number) => {
    if (!script) return;

    // Fill text helper
    const drawText = (text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left", maxWidth?: number) => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = "top";
      if (maxWidth) {
        ctx.fillText(text, x, y, maxWidth);
      } else {
        ctx.fillText(text, x, y);
      }
    };

    // Rounded rect helper
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number, fillStyle: string, strokeStyle?: string, lineWidth?: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();

      ctx.fillStyle = fillStyle;
      ctx.fill();
      if (strokeStyle && lineWidth) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    // Anti-Overlap Logic
    const isCoverActive = t >= 0 && t <= 3.2;
    const isOutroActive = dur > 5 && t >= dur - 3.5;
    const lockEvents = isCoverActive || isOutroActive;

    let activeLargeCard = false;
    const activeEvents = script.events?.filter(e => t >= e.start && t <= e.end) || [];

    if (!lockEvents) {
      for (const ev of activeEvents) {
        if (["qa_bubble", "myth_buster", "big_impact", "progress_card", "checklist_card"].includes(ev.type)) {
          activeLargeCard = true;
          break;
        }
      }
    }

    const scale = Math.min(w, h) / 1000;

    // Cover
    if (isCoverActive && script.cover) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, w, h);

      const boxW = w * 0.8;
      const boxH = h * 0.4;
      const boxX = (w - boxW) / 2;
      const boxY = (h - boxH) / 2;

      drawRoundedRect(boxX, boxY, boxW, boxH, 20 * scale, "rgba(15,23,42,0.92)", "#C8A97E", 2 * scale);

      // Title
      drawText(script.cover.title, w/2, boxY + boxH * 0.3, `700 ${48 * scale}px sans-serif`, "white", "center", boxW * 0.9);

      // Subtitle
      if (script.cover.subtitle) {
        ctx.beginPath();
        ctx.moveTo(boxX + boxW * 0.1, boxY + boxH * 0.65);
        ctx.lineTo(boxX + boxW * 0.9, boxY + boxH * 0.65);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        drawText(script.cover.subtitle, w/2, boxY + boxH * 0.75, `600 ${24 * scale}px sans-serif`, "#C8A97E", "center", boxW * 0.9);
      }
    }

    // Subtitles
    const currentSub = script.subtitles?.find(s => t >= s.start && t <= s.end);
    if (!isCoverActive && !isOutroActive && currentSub) {
      let fontSize = 36 * scale;
      ctx.font = `700 ${fontSize}px sans-serif`;

      // Auto-shrinking subtitles
      while (ctx.measureText(currentSub.text).width > w * 0.84 && fontSize > 16 * scale) {
        fontSize -= 1 * scale;
        ctx.font = `700 ${fontSize}px sans-serif`;
      }

      const textMetrics = ctx.measureText(currentSub.text);
      const textW = textMetrics.width;
      const padX = 40 * scale;
      const padY = 20 * scale;
      const bgW = textW + padX * 2;
      const bgH = fontSize + padY * 2;
      const bgX = (w - bgW) / 2;
      const bgY = h - bgH - (40 * scale);

      drawRoundedRect(bgX, bgY, bgW, bgH, bgH/2, "rgba(15,23,42,0.85)", "rgba(255,255,255,0.1)", 1 * scale);

      if (currentSub.highlight) {
        const parts = currentSub.text.split(currentSub.highlight);
        let currX = bgX + padX;

        for (let i = 0; i < parts.length; i++) {
          drawText(parts[i], currX, bgY + padY, `700 ${fontSize}px sans-serif`, "white", "left");
          currX += ctx.measureText(parts[i]).width;

          if (i < parts.length - 1) {
            drawText(currentSub.highlight, currX, bgY + padY, `700 ${fontSize}px sans-serif`, currentSub.color || "#FDE047", "left");
            currX += ctx.measureText(currentSub.highlight).width;
          }
        }
      } else {
        drawText(currentSub.text, w/2, bgY + padY, `700 ${fontSize}px sans-serif`, "white", "center");
      }
    }

    // Events
    if (!lockEvents) {
      activeEvents.forEach((ev) => {
        if (activeLargeCard && ["numbered_pill", "icon_pill", "target_focus", "warning_tape"].includes(ev.type)) return;

        const pad = 40 * scale;
        let x = pad;
        let y = pad;

        if (ev.position === "top-right") x = w - 400 * scale - pad;
        if (ev.position === "bottom-left") y = h - 300 * scale - pad;
        if (ev.position === "bottom-right") {
          x = w - 400 * scale - pad;
          y = h - 300 * scale - pad;
        }
        if (ev.position === "center") {
          x = (w - 400 * scale) / 2;
          y = (h - 300 * scale) / 2;
        }

        if (ev.type === "qa_bubble") {
          drawRoundedRect(x, y, 400 * scale, 150 * scale, 20 * scale, "rgba(255,255,255,0.98)");
          // Left border simulation
          drawRoundedRect(x, y, 8 * scale, 150 * scale, 4 * scale, "#38BDF8");
          drawText(ev.badge || "Q&A", x + 30 * scale, y + 20 * scale, `700 ${20 * scale}px sans-serif`, "#38BDF8");
          drawText(ev.title || ev.text || "", x + 30 * scale, y + 60 * scale, `700 ${28 * scale}px sans-serif`, "#1c1917", "left", 340 * scale);
        }

        if (ev.type === "myth_buster") {
          drawRoundedRect(x, y, 400 * scale, 160 * scale, 20 * scale, "rgba(15,23,42,0.92)", "rgba(255,107,107,0.3)", 2 * scale);
          drawText("MYTH BUSTED", x + 30 * scale, y + 20 * scale, `700 ${20 * scale}px sans-serif`, "#FF6B6B");

          if (ev.subtitle) {
            drawText(ev.subtitle, x + 30 * scale, y + 60 * scale, `700 ${24 * scale}px sans-serif`, "rgba(255,255,255,0.7)");
            // Strikethrough
            ctx.beginPath();
            ctx.moveTo(x + 30 * scale, y + 72 * scale);
            ctx.lineTo(x + 30 * scale + ctx.measureText(ev.subtitle).width, y + 72 * scale);
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
          }
          drawText(ev.title || "", x + 30 * scale, y + 100 * scale, `700 ${32 * scale}px sans-serif`, "#FDE047", "left", 340 * scale);
        }

        if (ev.type === "numbered_pill") {
          drawRoundedRect(x, y, 300 * scale, 60 * scale, 30 * scale, "rgba(15,23,42,0.92)", "rgba(255,255,255,0.2)", 1 * scale);
          drawText(ev.number || "", x + 25 * scale, y + 15 * scale, `700 ${24 * scale}px sans-serif`, "#FDE047");
          drawText(ev.text || "", x + 60 * scale, y + 15 * scale, `700 ${24 * scale}px sans-serif`, "white");
        }
      });
    }

    // Outro
    if (isOutroActive && script.outro) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, w, h);

      const boxW = w * 0.85;
      const boxH = h * 0.6;
      const boxX = (w - boxW) / 2;
      const boxY = (h - boxH) / 2;

      drawRoundedRect(boxX, boxY, boxW, boxH, 30 * scale, "rgba(15,23,42,0.95)", "#C8A97E", 2 * scale);

      drawText(script.outro.title, w/2, boxY + boxH * 0.15, `700 ${48 * scale}px sans-serif`, "white", "center", boxW * 0.9);

      script.outro.points.forEach((pt, i) => {
        drawText("•", boxX + boxW * 0.1, boxY + boxH * 0.35 + i * 50 * scale, `700 ${36 * scale}px sans-serif`, "#C8A97E");
        drawText(pt, boxX + boxW * 0.15, boxY + boxH * 0.35 + i * 50 * scale, `600 ${32 * scale}px sans-serif`, "#e7e5e4", "left", boxW * 0.75);
      });

      if (script.outro.signature) {
        ctx.beginPath();
        ctx.moveTo(boxX + boxW * 0.2, boxY + boxH * 0.8);
        ctx.lineTo(boxX + boxW * 0.8, boxY + boxH * 0.8);
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
        drawText(script.outro.signature, w/2, boxY + boxH * 0.85, `italic 600 ${24 * scale}px sans-serif`, "#C8A97E", "center");
      }
    }
  };

  const exportVideo = () => {
    if (!videoRef.current || !script) return;
    const vid = videoRef.current;

    setIsExporting(true);
    setExportProgress(0);
    setExportedFile(null);

    // 0 延遲同步啟動匯出架構
    vid.loop = false;
    vid.muted = true; // guarantee autoplay on iOS Safari
    vid.currentTime = 0;
    vid.play().catch(console.error);

    const audioCtx = new window.AudioContext();
    const audioDest = audioCtx.createMediaStreamDestination();
    let sourceNode: AudioBufferSourceNode | null = null;
    let dur = vid.duration || 15;

    // Decode audio in non-blocking background
    if (rawAudioBufferRef.current) {
      Promise.race([
        audioCtx.decodeAudioData(rawAudioBufferRef.current.slice(0)),
        new Promise<AudioBuffer>((_, reject) => setTimeout(() => reject(new Error("Audio decode timeout")), 2500))
      ]).then((audioBuffer) => {
        sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioDest);
        sourceNode.connect(audioCtx.destination);
        sourceNode.start(0);
        if (audioBuffer.duration > dur) dur = audioBuffer.duration;
      }).catch((err) => {
        console.warn("Audio decode failed or timed out, continuing without audio", err);
      });
    }

    const rawW = vid.videoWidth;
    const rawH = vid.videoHeight;
    const w = rawW & ~1;
    const h = rawH & ~1;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stream = canvas.captureStream(30);
    audioDest.stream.getAudioTracks().forEach(track => stream.addTrack(track));

    let mimeType = "video/webm";
    if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
      mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const fileExt = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `sport-cafe-v6.2.${fileExt}`, { type: mimeType });
      setExportedFile(file);
      setIsExporting(false);
      setExportProgress(100);
      vid.muted = isMuted; // restore original state
    };

    recorder.start(200);

    const drawFrame = () => {
      // Allow early stop or natural end
      const isStoppedEarly = !window.__isExporting;

      const t = vid.currentTime;
      setExportProgress((t / dur) * 100);

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(vid, 0, 0, w, h);
      drawOverlay(ctx, w, h, t, dur);

      if (!isStoppedEarly && t < dur && !vid.ended) {
        if (vid.paused) vid.play().catch(() => {});
        requestAnimationFrame(drawFrame);
      } else {
        vid.pause();
        recorder.stop();
        if (sourceNode) sourceNode.stop();
      }
    };

    window.__isExporting = true;
    drawFrame();
  };

  const stopExportEarly = () => {
    window.__isExporting = false;
  };

  useEffect(() => {
    // Cleanup early stop flag on unmount
    return () => {
      window.__isExporting = false;
    };
  }, []);

  const renderExportPanel = () => {
    if (!isPreviewMode) return null;

    return (
      <div className="w-full bg-white border border-stone-200 rounded-2xl p-4 mt-4 shadow-sm z-50 relative">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#6B1D2F] font-bold text-sm">
            <span>🎬</span> 內部審片室模式匯出工具
          </div>
          <p className="text-xs text-stone-500">
            請注意：匯出過程將在背景播放並錄製影片，請保持網頁開啟直至 100%。
          </p>

          {!exportedFile ? (
            isExporting ? (
              <button
                onClick={stopExportEarly}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition shadow-sm flex items-center justify-center gap-2"
              >
                ⏹ 提前完成並產生 MP4 檔案 (目前 {Math.round(exportProgress)}%)
              </button>
            ) : (
              <button
                onClick={exportVideo}
                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-[#6B1D2F] hover:bg-[#5a1827] transition shadow-sm"
              >
                🎬 匯出有聲 MP4 影片 (v6.2)
              </button>
            )
          ) : (
            <div className="flex flex-col gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <span>✅</span> 匯出成功！
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        files: [exportedFile]
                      }).catch(console.error);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#06C755] hover:bg-[#05b34c] transition shadow-sm"
                >
                  📲 儲存到 iPhone 相簿 / 傳送至 LINE (v6.2)
                </button>
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(exportedFile);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = exportedFile.name || "sport-cafe-v6.2.mp4";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-12 sm:w-auto px-3 py-3 rounded-xl text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition shadow-sm flex items-center justify-center"
                  title="直接下載 MP4 影片檔 (v6.2)"
                >
                  💾
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const containerClass = `relative w-full overflow-hidden bg-black ${
    isVertical
      ? isFullscreen && isRotated
        ? "w-[100vh] h-[100vw] origin-top-left translate-y-[100vw] -rotate-90"
        : "aspect-[9/16] max-w-[400px] mx-auto rounded-2xl"
      : isFullscreen && isRotated
        ? "w-[100vh] h-[100vw] origin-top-left translate-y-[100vw] -rotate-90"
        : "aspect-video rounded-2xl"
  }`;

  return (
    <div className="w-full flex flex-col items-center">
      <div
        ref={containerRef}
        className={containerClass}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          className="w-full h-full object-contain pointer-events-none"
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          controlsList={!isPreviewMode ? "nodownload" : undefined}
          onContextMenu={(e) => !isPreviewMode && e.preventDefault()}
          crossOrigin="anonymous"
        />

        {renderOverlays()}

        {/* Tap to play/pause overlay */}
        <div
          className="absolute inset-0 z-30 cursor-pointer"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        />

        {/* iPhone Safari Controls (Bottom Bar) */}
        {isPreviewMode && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-40 bg-black/65 backdrop-blur-md px-4 py-3 flex flex-col gap-2 transition-transform duration-300 ${
              isFullscreen || isRotated ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
            }`}
          >
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="text-white w-8 h-8 flex items-center justify-center font-bold text-lg shrink-0">
                {isPlaying ? "⏸" : "▶"}
              </button>

              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleScrub}
                  className="w-full h-1.5 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              <div className="text-white text-[10px] font-mono shrink-0 w-12 text-right">
                {Math.floor(currentTime)}s
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <button onClick={toggleMute} className="text-white text-xs font-bold px-2 py-1 rounded bg-white/10">
                {isMuted ? "🔇 靜音中" : "🔊 開啟聲音"}
              </button>

              <div className="flex items-center gap-2">
                {isVertical && (
                  <button onClick={toggleRotate} className="text-white text-xs font-bold px-2 py-1 rounded bg-white/10">
                    🔄 橫向滿版
                  </button>
                )}
                <button onClick={toggleFullscreen} className="text-white text-xs font-bold px-2 py-1 rounded bg-white/10">
                  {isFullscreen ? "✕ 退出全螢幕" : "⛶ 全螢幕"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen exit button top right when rotated/fullscreen */}
        {(isFullscreen || isRotated) && (
          <button
            onClick={() => {
              if (isRotated) toggleRotate();
              if (isFullscreen) toggleFullscreen();
            }}
            className="absolute top-6 right-6 z-50 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur"
          >
            ✕ 退出全螢幕
          </button>
        )}
      </div>

      {renderExportPanel()}
    </div>
  );
}
