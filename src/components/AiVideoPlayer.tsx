/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

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

export interface EventItem {
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
  sfx?: string;
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
  events?: EventItem[];
  outro?: OutroSpec;
}

interface AiVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
  script?: VideoScript;
  isPreviewMode?: boolean;
  defaultVertical?: boolean;
}

declare global {
  interface Window {
    __isExporting?: boolean;
  }
}

export default function AiVideoPlayer({
  videoUrl,
  posterUrl,
  script,
  isPreviewMode = false,
  defaultVertical = true,
}: AiVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [isVertical, setIsVertical] = useState(defaultVertical);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedFile, setExportedFile] = useState<File | null>(null);

  const rawAudioBufferRef = useRef<ArrayBuffer | null>(null);

  // Auto-hide controls state
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Auto-hide controls logic
  const startControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2800);
    }
  }, [isPlaying]);

  useEffect(() => {
    startControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, startControlsTimeout]);

  const handleUserInteraction = () => {
    setShowControls(true);
    startControlsTimeout();
  };

  const handleVideoClick = () => {
    if (!showControls) {
      setShowControls(true);
      startControlsTimeout();
      togglePlay();
    } else {
      togglePlay();
    }
  };

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

        if (lastCardEnd > 0 && dur > lastCardEnd + 3) {
          const ratio = dur / lastCardEnd;
          if (ratio > 1.2 && ratio < 3) {
             console.log("Auto-scaling script timing by ratio:", ratio);
             if (script.subtitles) script.subtitles.forEach(s => { s.start *= ratio; s.end *= ratio; });
             if (script.events) script.events.forEach(e => { e.start *= ratio; e.end *= ratio; });
          }
        }
      }
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
    handleUserInteraction();
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    vid.addEventListener("play", handlePlay);
    vid.addEventListener("pause", handlePause);
    vid.addEventListener("ended", handleEnded);

    return () => {
      vid.removeEventListener("play", handlePlay);
      vid.removeEventListener("pause", handlePause);
      vid.removeEventListener("ended", handleEnded);
    };
  }, []);


  // Sync state after remounting from portal transitions
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      if (vid.currentTime !== currentTime) {
        vid.currentTime = currentTime;
      }
      if (isPlaying) {
        vid.play().catch(console.error);
      }
    }
  }, [isFullscreen, isRotated]);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setIsRotated(false);
  };

  const toggleRotate = () => {
    setIsRotated(prev => !prev);
    setIsFullscreen(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
      }
    };

    const isCoverActive = t >= 0 && t <= 3.2;
    const isOutroActive = dur > 5 && t >= dur - 3.5;
    const lockEvents = isCoverActive || isOutroActive;

    // --- Cover ---
    if (isCoverActive && script.cover) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, w, h);

      const boxW = w * 0.86;
      const boxH = 150;
      const boxX = (w - boxW) / 2;
      const boxY = (h - boxH) / 2;

      drawRoundedRect(boxX, boxY, boxW, boxH, 16, "rgba(15, 23, 42, 0.95)", "#C8A97E", 2);

      drawText(script.cover.title, w / 2, boxY + 40, "700 24px sans-serif", "#ffffff", "center", boxW - 40);

      if (script.cover.subtitle) {
        ctx.fillStyle = "#C8A97E";
        ctx.fillRect(boxX + boxW / 2 - 30, boxY + 85, 60, 2);
        drawText(script.cover.subtitle, w / 2, boxY + 100, "600 16px sans-serif", "#FDE047", "center", boxW - 40);
      }

      if (script.cover.stamp) {
        drawRoundedRect(boxX + boxW - 20, boxY - 20, 44, 44, 22, "#6B1D2F", "#FDE047", 2);
        ctx.save();
        ctx.translate(boxX + boxW + 2, boxY + 2);
        ctx.rotate(12 * Math.PI / 180);
        drawText(script.cover.stamp, 0, -6, "700 12px sans-serif", "#FDE047", "center");
        ctx.restore();
      }

      if (script.cover.journal) {
        drawRoundedRect(w / 2 - 100, boxY - 40, 200, 24, 12, "#C8A97E");
        drawText(`${script.cover.journal}${script.cover.date ? ' | ' + script.cover.date : ''}`, w / 2, boxY - 35, "700 12px sans-serif", "#0F172A", "center");
      }

      if (script.cover.speaker) {
        drawRoundedRect(20, h - 80, 150, 45, 8, "rgba(255,255,255,0.95)");
        ctx.fillStyle = "#6B1D2F";
        ctx.fillRect(20, h - 80, 4, 45);
        drawText(script.cover.speakerRole || "GUEST", 32, h - 75, "700 10px sans-serif", "#6B1D2F", "left");
        drawText(script.cover.speaker, 32, h - 60, "700 16px sans-serif", "#1c1917", "left");
      }
    }

    // --- Subtitles ---
    const currentSub = script.subtitles?.find(s => t >= s.start && t <= s.end);
    if (!isCoverActive && !isOutroActive && currentSub) {
      // Move subtitle up slightly to match HTML view which moves up when controls show, but since it's export, always place at a fixed comfortable position.
      const subY = h - 60;
      ctx.font = "700 20px sans-serif";
      const metrics = ctx.measureText(currentSub.text);
      const textW = Math.min(metrics.width + 40, w * 0.92);
      const subX = (w - textW) / 2;

      drawRoundedRect(subX, subY - 10, textW, 40, 20, "rgba(15, 23, 42, 0.92)", "rgba(200, 169, 126, 0.5)", 1);

      if (currentSub.highlight) {
        const parts = currentSub.text.split(currentSub.highlight);
        let currentX = w / 2 - (ctx.measureText(currentSub.text).width) / 2;

        parts.forEach((part, i) => {
          drawText(part, currentX, subY, "700 20px sans-serif", "#ffffff", "left");
          currentX += ctx.measureText(part).width;

          if (i < parts.length - 1) {
            drawText(currentSub.highlight!, currentX, subY, "700 20px sans-serif", currentSub.color || "#FDE047", "left");
            currentX += ctx.measureText(currentSub.highlight!).width;
          }
        });
      } else {
        drawText(currentSub.text, w / 2, subY, "700 20px sans-serif", "#ffffff", "center", textW - 20);
      }
    }

    // --- Events ---
    const activeEvents = script.events?.filter(e => t >= e.start && t <= e.end) || [];
    if (!lockEvents && activeEvents.length > 0) {
      let activeLargeCard = false;
      for (const ev of activeEvents) {
        if (["qa_bubble", "myth_buster", "big_impact", "progress_card", "checklist_card"].includes(ev.type)) {
          activeLargeCard = true;
          break;
        }
      }

      activeEvents.forEach(ev => {
        if (activeLargeCard && ["numbered_pill", "icon_pill", "target_focus", "warning_tape"].includes(ev.type)) {
          return;
        }

        let evX = 20, evY = 20;
        if (ev.position === "top-right") evX = w - 220;
        if (ev.position === "bottom-left") evY = h - 160;
        if (ev.position === "bottom-right") { evX = w - 220; evY = h - 160; }
        if (ev.position === "center") { evX = w / 2 - 100; evY = h / 2 - 50; }

        if (ev.type === "myth_buster") {
          drawRoundedRect(evX, evY, 200, 70, 16, "rgba(255,255,255,0.98)", "#f43f5e", 2);
          drawRoundedRect(evX + 10, evY - 10, 100, 20, 10, "#f43f5e");
          drawText(ev.badge || "❌ 動作迷思破解", evX + 60, evY - 6, "700 10px sans-serif", "#ffffff", "center");
          if (ev.title) drawText(ev.title, evX + 10, evY + 18, "700 14px sans-serif", "#0f172a", "left", 180);
          if (ev.subtitle || ev.text) drawText(ev.subtitle || ev.text || "", evX + 10, evY + 40, "600 12px sans-serif", "#be123c", "left", 180);
        }
        else if (ev.type === "qa_bubble") {
          drawRoundedRect(evX, evY, 200, 70, 16, "rgba(255,255,255,0.98)", "#f59e0b", 2);
          drawRoundedRect(evX + 10, evY - 10, 100, 20, 10, "#f59e0b");
          drawText(ev.badge || "💬 職人 Q&A", evX + 60, evY - 6, "700 10px sans-serif", "#ffffff", "center");
          if (ev.title) drawText(ev.title, evX + 10, evY + 18, "700 14px sans-serif", "#0f172a", "left", 180);
          if (ev.subtitle || ev.text) drawText(ev.subtitle || ev.text || "", evX + 10, evY + 40, "600 12px sans-serif", "#451a03", "left", 180);
        }
        else if (ev.type === "big_impact") {
          const bw = 220, bh = 80;
          const bx = w/2 - bw/2, by = ev.position === 'center' ? h/2 - bh/2 : 60;
          drawRoundedRect(bx, by, bw, bh, 16, "rgba(15,23,42,0.95)", "#fde047", 2);
          drawText("✦ KEY POINT ✦", w/2, by + 10, "700 10px sans-serif", "#94a3b8", "center");
          if (ev.title) drawText(ev.title, w/2, by + 28, "700 18px sans-serif", "#fde047", "center", bw - 20);
          if (ev.subtitle || ev.text) drawText(ev.subtitle || ev.text || "", w/2, by + 55, "600 12px sans-serif", "#ffffff", "center", bw - 20);
        }
        else if (ev.type === "target_focus") {
          drawRoundedRect(evX, evY, 150, 32, 12, "rgba(15,23,42,0.92)", "#38bdf8", 1);
          drawText("🎯", evX + 16, evY + 8, "16px sans-serif", "#ffffff", "center");
          if (ev.title) drawText(ev.title, evX + 32, evY + 9, "700 12px sans-serif", "#ffffff", "left", 110);
        }
        else if (ev.type === "numbered_pill" || ev.type === "icon_pill") {
          drawRoundedRect(evX, evY, 180, 50, 12, "rgba(255,255,255,0.98)");
          ctx.fillStyle = "#6B1D2F";
          ctx.fillRect(evX, evY, 4, 50);

          ctx.fillStyle = "#6B1D2F";
          ctx.beginPath();
          ctx.arc(evX + 24, evY + 25, 12, 0, Math.PI * 2);
          ctx.fill();
          drawText(ev.number || ev.icon || "1", evX + 24, evY + 19, "700 10px sans-serif", "#ffffff", "center");

          if (ev.title) drawText(ev.title, evX + 44, evY + 12, "700 12px sans-serif", "#0f172a", "left", 130);
          if (ev.subtitle || ev.text) drawText(ev.subtitle || ev.text || "", evX + 44, evY + 28, "600 10px sans-serif", "#64748b", "left", 130);
        }
        else if (ev.type === "warning_tape") {
          drawRoundedRect(evX, evY, 160, 32, 8, "#fde047", "#0f172a", 2);
          if (ev.title) drawText(ev.title, evX + 80, evY + 10, "700 12px sans-serif", "#0f172a", "center", 150);
        }
        else if (ev.type === "progress_card") {
          drawRoundedRect(evX, evY, 200, 70, 16, "rgba(255,255,255,0.98)", "#e2e8f0", 1);
          if (ev.title) drawText(ev.title, evX + 16, evY + 16, "700 12px sans-serif", "#64748b", "left");
          drawText(`${ev.progress || 95}%`, evX + 184, evY + 16, "700 16px sans-serif", "#0f172a", "right");
          drawRoundedRect(evX + 16, evY + 40, 168, 6, 3, "#f1f5f9");
          drawRoundedRect(evX + 16, evY + 40, 168 * ((ev.progress || 95) / 100), 6, 3, "#3b82f6");
          if (ev.subtitle) drawText(ev.subtitle, evX + 16, evY + 52, "600 10px sans-serif", "#64748b", "left", 168);
        }
        else if (ev.type === "checklist_card") {
          drawRoundedRect(evX, evY, 200, 90, 16, "rgba(255,255,255,0.98)", "#10b981", 2);
          drawRoundedRect(evX + 10, evY - 10, 100, 20, 10, "#10b981");
          drawText(ev.badge || "✅ 專業檢核重點", evX + 60, evY - 6, "700 10px sans-serif", "#ffffff", "center");
          if (ev.title) drawText(ev.title, evX + 10, evY + 16, "700 14px sans-serif", "#0f172a", "left", 180);
          if (ev.items) {
            ev.items.forEach((item, idx) => {
              drawText(`✓ ${item}`, evX + 10, evY + 40 + idx * 16, "600 12px sans-serif", "#047857", "left", 180);
            });
          }
        }
      });
    }

    // --- Outro ---
    if (isOutroActive && script.outro) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      ctx.fillRect(0, 0, w, h);

      drawRoundedRect(w / 2 - 30, 40, 60, 60, 30, "#C8A97E");
      drawText("✦", w / 2, 60, "700 24px sans-serif", "#ffffff", "center");

      drawText(script.outro.title, w / 2, 120, "700 24px sans-serif", "#ffffff", "center", w - 40);

      script.outro.points?.forEach((pt, i) => {
        const py = 180 + i * 36;
        drawRoundedRect(w / 2 - 120, py - 4, 240, 30, 8, "rgba(255,255,255,0.1)");
        drawText(`${i + 1}. ${pt}`, w / 2, py + 2, "600 14px sans-serif", "#ffffff", "center");
      });

      if (script.outro.signature) {
        drawText(script.outro.signature, w / 2, h - 100, "600 12px sans-serif", "#94a3b8", "center");
      }

      drawRoundedRect(w / 2 - 120, h - 60, 240, 36, 18, "#06C755");
      drawText(script.outro.cta || "💬 立即點擊下方 LINE 預約體驗", w / 2, h - 48, "700 14px sans-serif", "#ffffff", "center");
    }
  };

  const exportVideo = () => {
    const vid = videoRef.current;
    if (!vid || !script) return;
    setIsExporting(true);
    setExportedFile(null);
    setExportProgress(0);

    vid.muted = false;
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

  // HTML Overlay rendering
  const renderOverlays = () => {
    if (!script) return null;

    const t = currentTime;
    const dur = duration || 0.1;

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

    const currentSub = script.subtitles?.find(s => t >= s.start && t <= s.end);

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 font-sans">
        {/* Cover */}
        {isCoverActive && script.cover && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 bg-black/40 animate-fade-in">
            {script.cover.journal && (
              <div className="inline-block bg-[#C8A97E] text-slate-950 font-bold text-[10px] sm:text-xs px-3 py-1 rounded-full tracking-widest shadow-md shrink-0 mt-6">
                {script.cover.journal} {script.cover.date ? `| ${script.cover.date}` : ''}
              </div>
            )}

            <div className="bg-[#0F172A]/95 border-2 border-[#C8A97E] rounded-2xl px-5 py-3.5 max-w-[86%] text-center shadow-2xl relative shrink-0">
              {script.cover.stamp && (
                <div className="absolute -top-3 -right-3 w-11 h-11 rounded-full bg-[#6B1D2F] border-2 border-[#FDE047] text-[#FDE047] text-[10px] font-bold flex items-center justify-center rotate-12 shadow-lg z-10">
                  {script.cover.stamp}
                </div>
              )}

              <h1 className="text-white font-bold text-base sm:text-2xl tracking-wide leading-snug" style={{ fontWeight: 700 }}>
                {script.cover.title}
              </h1>

              <div className="w-16 h-[2px] bg-[#C8A97E] mx-auto my-1.5" />

              {script.cover.subtitle && (
                <p className="text-[#FDE047] font-semibold text-xs sm:text-sm tracking-wider" style={{ fontWeight: 600 }}>
                  {script.cover.subtitle}
                </p>
              )}
            </div>

            {script.cover.speaker && (
              <div className="bg-white/95 text-slate-900 border-l-4 border-[#6B1D2F] px-3 py-1 rounded-r-lg text-[10px] sm:text-xs font-bold shadow-md flex flex-col self-start shrink-0 mb-6">
                <span className="text-[#6B1D2F] tracking-wider uppercase mb-0.5">{script.cover.speakerRole || 'GUEST'}</span>
                <span>{script.cover.speaker}</span>
              </div>
            )}
          </div>
        )}

        {/* Subtitles */}
        {!isCoverActive && !isOutroActive && currentSub && (
          <div className={`absolute ${showControls ? 'bottom-16' : 'bottom-3'} w-full px-4 flex justify-center z-20 transition-all duration-300`}>
            <div className="bg-[#0F172A]/92 border border-[#C8A97E]/50 px-4 py-1.5 rounded-full shadow-xl max-w-[92%] text-center">
              <p className="text-white text-base md:text-lg tracking-wide drop-shadow-md" style={{ fontWeight: 700 }}>
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
          if (activeLargeCard && ["numbered_pill", "icon_pill", "target_focus", "warning_tape"].includes(ev.type)) {
            return null;
          }

          const posClass =
            ev.position === "top-left" ? "top-3 left-3" :
            ev.position === "top-right" ? "top-3 right-3" :
            ev.position === "bottom-left" ? "bottom-24 left-3" :
            ev.position === "bottom-right" ? "bottom-24 right-3" :
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";

          return (
            <div key={idx} className={`absolute ${posClass} max-w-[68%] sm:max-w-[52%] flex flex-col gap-2 z-10 animate-scale-in`}>
              {ev.type === "myth_buster" && (
                <div className="bg-white/98 border-2 border-rose-500 rounded-2xl p-2.5 shadow-xl text-slate-900 flex flex-col relative pt-4 mt-2">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-md">
                    {ev.badge || "❌ 動作迷思破解"}
                  </div>
                  {ev.title && <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">{ev.title}</h3>}
                  {(ev.subtitle || ev.text) && <p className="text-[11px] text-rose-700 font-semibold mt-0.5 leading-snug">{ev.subtitle || ev.text}</p>}
                </div>
              )}

              {ev.type === "qa_bubble" && (
                <div className="bg-white/98 border-2 border-amber-500 rounded-2xl p-2.5 shadow-xl text-slate-900 flex flex-col relative pt-4 mt-2">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-md">
                    {ev.badge || "💬 職人 Q&A 解答"}
                  </div>
                  {ev.title && <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">{ev.title}</h3>}
                  {(ev.subtitle || ev.text) && <p className="text-[11px] text-amber-700 font-semibold mt-0.5 leading-snug">{ev.subtitle || ev.text}</p>}
                </div>
              )}

              {ev.type === "big_impact" && (
                <div className="bg-[#0F172A]/95 border-2 border-[#FDE047] rounded-2xl px-4 py-2.5 shadow-2xl text-center flex flex-col items-center">
                  <span className="text-[#94A3B8] text-[9px] font-bold tracking-widest mb-1">✦ KEY POINT ✦</span>
                  {ev.title && <h3 className="text-[#FDE047] font-bold text-sm sm:text-lg leading-tight mb-1">{ev.title}</h3>}
                  {(ev.subtitle || ev.text) && <p className="text-white text-xs sm:text-sm font-semibold">{ev.subtitle || ev.text}</p>}
                </div>
              )}

              {ev.type === "target_focus" && (
                <div className="bg-[#0F172A]/92 border border-[#38BDF8] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
                  <span className="text-base">🎯</span>
                  <span className="leading-tight">{ev.title || ev.text}</span>
                </div>
              )}

              {(ev.type === "numbered_pill" || ev.type === "icon_pill") && (
                <div className="bg-white/98 border-l-4 border-[#6B1D2F] rounded-xl px-3 py-2 shadow-lg text-slate-900 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#6B1D2F] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {ev.number || ev.icon || "⚡"}
                  </div>
                  <div className="flex flex-col">
                    {ev.title && <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">{ev.title}</h3>}
                    {(ev.subtitle || ev.text) && <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold leading-snug">{ev.subtitle || ev.text}</p>}
                  </div>
                </div>
              )}

              {ev.type === "warning_tape" && (
                <div className="bg-[#FDE047] text-slate-950 border-y-2 border-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs shadow-lg flex items-center justify-center">
                  {ev.title || ev.text}
                </div>
              )}

              {ev.type === "progress_card" && (
                <div className="bg-white/98 border border-slate-200 rounded-2xl p-2.5 shadow-xl text-slate-900 flex flex-col gap-1.5 w-40">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-bold text-[10px]">{ev.title}</span>
                    <span className="text-slate-900 font-black text-sm">{ev.progress || 95}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ev.progress || 95}%` }} />
                  </div>
                  {ev.subtitle && <p className="text-slate-400 font-semibold text-[9px]">{ev.subtitle}</p>}
                </div>
              )}

              {ev.type === "checklist_card" && (
                <div className="bg-white/98 border-2 border-emerald-500 rounded-2xl p-2.5 shadow-xl text-slate-900 flex flex-col relative pt-4 mt-2">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-md">
                    {ev.badge || "✅ 專業檢核重點"}
                  </div>
                  {ev.title && <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight mb-1.5">{ev.title}</h3>}
                  <ul className="flex flex-col gap-1">
                    {ev.items?.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] font-semibold text-emerald-800">
                        <span className="text-emerald-500 shrink-0">✓</span>
                        <span className="leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}

        {/* Outro */}
        {isOutroActive && script.outro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-[#0F172A]/95 text-center z-30 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-[#C8A97E] flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg shrink-0">
              ✦
            </div>
            <h2 className="text-white text-xl md:text-2xl font-bold mb-6" style={{ fontWeight: 700 }}>
              {script.outro.title}
            </h2>
            <ul className="flex flex-col gap-3 w-full max-w-[260px] mb-8">
              {script.outro.points?.map((pt, i) => (
                <li key={i} className="bg-white/10 rounded-lg py-2 px-3 text-white text-sm font-semibold flex items-center justify-center shadow-inner">
                  {i + 1}. {pt}
                </li>
              ))}
            </ul>
            {script.outro.signature && (
              <p className="text-[#94a3b8] text-xs font-semibold mb-6">
                {script.outro.signature}
              </p>
            )}
            <div className="bg-[#06C755] text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-xl mt-auto">
              {script.outro.cta || "💬 立即點擊下方 LINE 預約體驗"}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlayerContent = () => (
    <div className="w-full flex flex-col items-center h-full justify-center">
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-black ${
          isFullscreen || isRotated ? 'max-w-full max-h-full' : (isVertical ? 'aspect-[9/16] max-w-[400px] mx-auto rounded-2xl' : 'aspect-video rounded-2xl')
        }`}
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
          onClick={handleVideoClick}
          aria-label={isPlaying ? "Pause" : "Play"}
        />

        {/* Floating Controls (Always available, auto-hides) */}
        <div
          className={`absolute bottom-2 left-2 right-2 z-40 bg-slate-950/75 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 flex flex-col gap-1.5 transition-all duration-300 ${
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          {/* First row: Progress & Time */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleScrub}
                className="w-full h-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
            <div className="text-white text-[10px] font-mono shrink-0 w-[70px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Second row: Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={togglePlay} className="text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                {isPlaying ? "⏸ 暫停" : "▶ 播放"}
              </button>
              <button onClick={toggleMute} className="text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                {isMuted ? "🔇 靜音中" : "🔊 已開聲音"}
              </button>
            </div>
            <div className="flex gap-2">
              {isVertical && (
                <button onClick={toggleRotate} className="text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                  🔄 橫向
                </button>
              )}
              <button onClick={toggleFullscreen} className="text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">
                {isFullscreen ? "✕ 縮小" : "🔍 放大"}
              </button>
            </div>
          </div>
        </div>

        {/* Fullscreen/Rotated Exit Button */}
        {(isFullscreen || isRotated) && (
          <button
            onClick={() => { setIsFullscreen(false); setIsRotated(false); }}
            className="absolute top-4 right-4 z-[1000000] bg-black/80 text-white border border-white/30 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
          >
            {isRotated ? "✕ 退出橫向" : "✕ 退出放大"}
          </button>
        )}
      </div>

      {!isFullscreen && !isRotated && renderExportPanel()}
    </div>
  );

  // Portal wrappers for true fullscreen/rotated modes
  if (!mounted) return null;

  if (isFullscreen) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: 999999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderPlayerContent()}
      </div>,
      document.body
    );
  }

  if (isRotated) {
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 999999, background: '#000', overflow: 'hidden' }}>
        <div style={{ position: 'fixed', top: '50%', left: '50%', width: '100dvh', height: '100vw', transform: 'translate(-50%, -50%) rotate(90deg)', zIndex: 999999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderPlayerContent()}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      {renderPlayerContent()}
    </div>
  );
}
