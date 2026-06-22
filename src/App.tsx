/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore } from "./stores/useAppStore";
import { BrandLogo } from "./components/BrandLogo";
import GhostLoader from "./components/GhostLoader";
import { SupportedPlatforms } from "./components/SupportedPlatforms";
import { MetadataPreview } from "./components/MetadataPreview";
import { SearchAndBrowse } from "./components/SearchAndBrowse";
import { SettingsModal } from "./components/SettingsModal";
import { AboutModal } from "./components/AboutModal";
import { DownloadState, QueueItem } from "./types";
import { AnimatePresence, motion } from "motion/react";
import { ImageDownloader } from "./components/ImageDownloader";
import {
  Search,
  Settings,
  HelpCircle,
  Github,
  Globe,
  Clipboard,
  X,
  Heart,
  ChevronDown,
  AlertTriangle,
  Gauge,
  Clock,
  Save,
  FileImage,
} from "lucide-react";
import { apiFetch } from "./lib/api";

const HeroSunSVG = () => (
  <svg className="absolute -top-20 -right-20 w-72 h-72 opacity-15 pointer-events-none text-amber" viewBox="0 0 200 200" fill="none">
    <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" />
    <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
    <circle cx="100" cy="100" r="45" stroke="currentColor" strokeWidth="1" />
    <line x1="100" y1="5" x2="100" y2="25" stroke="currentColor" strokeWidth="2" />
    <line x1="100" y1="175" x2="100" y2="195" stroke="currentColor" strokeWidth="2" />
    <line x1="5" y1="100" x2="25" y2="100" stroke="currentColor" strokeWidth="2" />
    <line x1="175" y1="100" x2="195" y2="100" stroke="currentColor" strokeWidth="2" />
    <line x1="32" y1="32" x2="46" y2="46" stroke="currentColor" strokeWidth="1.5" />
    <line x1="154" y1="154" x2="168" y2="168" stroke="currentColor" strokeWidth="1.5" />
    <line x1="32" y1="168" x2="46" y2="154" stroke="currentColor" strokeWidth="1.5" />
    <line x1="154" y1="46" x2="168" y2="32" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const HeroImageSVG = () => (
  <svg className="absolute -top-16 -right-16 w-72 h-72 opacity-15 pointer-events-none text-amber" viewBox="0 0 200 200" fill="none">
    <rect x="20" y="30" width="160" height="120" rx="4" stroke="currentColor" strokeWidth="2" />
    <circle cx="60" cy="70" r="14" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="60" cy="70" r="6" fill="currentColor" fillOpacity="0.15" />
    <path d="M20 130 L70 90 L110 115 L150 75 L180 100 L180 150 L20 150 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
    <rect x="30" y="160" width="60" height="10" rx="2" stroke="currentColor" strokeWidth="1" />
    <rect x="100" y="160" width="40" height="10" rx="2" stroke="currentColor" strokeWidth="1" />
    <rect x="150" y="160" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1" />
    <path d="M140 30 L170 30 L170 60" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
    <circle cx="155" cy="45" r="6" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const HeroImageFrameSVG = () => (
  <svg className="absolute -bottom-8 -left-8 w-56 h-56 opacity-15 pointer-events-none text-amber" viewBox="0 0 200 200" fill="none">
    <rect x="30" y="20" width="140" height="100" rx="3" stroke="currentColor" strokeWidth="2" />
    <rect x="40" y="30" width="120" height="80" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" />
    <path d="M40 90 L70 60 L100 80 L140 50 L160 70 L160 110 L40 110 Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1" />
    <circle cx="70" cy="50" r="8" stroke="currentColor" strokeWidth="1" />
    <rect x="50" y="130" width="100" height="6" rx="1" stroke="currentColor" strokeWidth="0.8" />
    <rect x="60" y="142" width="80" height="4" rx="1" stroke="currentColor" strokeWidth="0.8" />
    <rect x="70" y="152" width="60" height="4" rx="1" stroke="currentColor" strokeWidth="0.8" />
    <path d="M145 170 L155 170 L155 180 L145 180 Z" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    <path d="M160 170 L175 170 L175 180 L160 180 Z" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

const Star4 = ({ x, y, size = 6 }: { x: number; y: number; size?: number }) => (
  <path
    d={`M${x} ${y - size} L${x + size * 0.3} ${y - size * 0.3} L${x + size} ${y} L${x + size * 0.3} ${y + size * 0.3} L${x} ${y + size} L${x - size * 0.3} ${y + size * 0.3} L${x - size} ${y} L${x - size * 0.3} ${y - size * 0.3} Z`}
    stroke="currentColor" strokeWidth="0.8" fill="currentColor" fillOpacity="0.3"
  />
);

const HeroMoonSVG = () => (
  <svg className="absolute -top-16 -right-16 w-72 h-72 opacity-20 pointer-events-none text-amber" viewBox="-30 -30 260 260" fill="none">
    <circle cx="100" cy="80" r="55" stroke="currentColor" strokeWidth="2" />
    <circle cx="72" cy="65" r="40" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
    <circle cx="108" cy="108" r="7" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="85" cy="118" r="4" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="122" cy="68" r="3" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="78" cy="88" r="5" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="118" cy="90" r="2.5" stroke="currentColor" strokeWidth="0.8" />
    <Star4 x={20} y={30} size={5} />
    <Star4 x={180} y={20} size={7} />
    <Star4 x={40} y={160} size={4} />
    <Star4 x={160} y={140} size={6} />
    <Star4 x={60} y={10} size={3} />
    <Star4 x={140} y={180} size={5} />
    <Star4 x={10} y={100} size={4} />
    <Star4 x={190} y={80} size={3} />
    <line x1="100" y1="10" x2="100" y2="20" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
    <line x1="100" y1="175" x2="100" y2="185" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.3" />
  </svg>
);

const TowerSVG = () => (
  <svg className="absolute -bottom-8 -left-8 w-56 h-56 opacity-15 pointer-events-none text-amber" viewBox="0 0 200 200" fill="none">
    <rect x="85" y="40" width="30" height="120" stroke="currentColor" strokeWidth="2" />
    <rect x="70" y="70" width="60" height="8" stroke="currentColor" strokeWidth="1.5" />
    <rect x="75" y="95" width="50" height="6" stroke="currentColor" strokeWidth="1" />
    <rect x="80" y="115" width="40" height="5" stroke="currentColor" strokeWidth="1" />
    <polygon points="85,40 100,15 115,40" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="100" y1="15" x2="100" y2="5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="90" y="140" width="20" height="20" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    <circle cx="100" cy="150" r="3" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function DownloaderDashboard() {
  const {
    urlInput,
    setUrlInput,
    isAnalyzing,
    setAnalyzing,
    analyzedMetadata,
    setAnalyzedMetadata,
    analysisError,
    setAnalysisError,
    setSettingsOpen,
    setAboutOpen,
    themeMode,
    activeJobs,
    updateJob,
    removeJob,
    isQueueExpanded,
    setQueueExpanded,
    appMode,
    setAppMode,
  } = useAppStore();

  const [hasAnimationShake, setHasAnimationShake] = useState(false);
  const [headerQueueOpen, setHeaderQueueOpen] = useState(false);

  const activeCount = activeJobs.filter(
    (j) => j.state !== DownloadState.COMPLETED && j.state !== DownloadState.FAILED
  ).length;
  const failedCount = activeJobs.filter(
    (j) => j.state === DownloadState.FAILED
  ).length;

  // ─── Poll active jobs ───
  useEffect(() => {
    const activeRunningJobs = activeJobs.filter(
      (job) => job.state !== DownloadState.COMPLETED && job.state !== DownloadState.FAILED
    );
    if (activeRunningJobs.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const runningJob of activeRunningJobs) {
        try {
          const res = await apiFetch(`/api/jobs/${runningJob.id}`);
          if (!res.ok) continue;
          const data = await res.json();
          updateJob(runningJob.id, {
            state: data.state,
            progress: data.progress,
            speedMbps: data.speedMbps,
            etaSeconds: data.etaSeconds,
            downloadUrl: data.downloadUrl,
            fileSizeLabel: data.fileSizeLabel,
            quality: data.quality,
            error: data.error,
          });
        } catch {}
      }
    }, 800);

    return () => clearInterval(pollInterval);
  }, [activeJobs, updateJob]);

  // ─── Open header dropdown when a new job is added ───
  useEffect(() => {
    if (isQueueExpanded) {
      setHeaderQueueOpen(true);
      setQueueExpanded(false);
    }
  }, [isQueueExpanded, setQueueExpanded]);

  // ─── Close header queue dropdown on outside click ───
  useEffect(() => {
    if (!headerQueueOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".header-queue-dropdown-area")) {
        setHeaderQueueOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [headerQueueOpen]);

  // ─── Theme: toggle .dark / .dark-2 class on <html> ───
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const html = document.documentElement;
      html.classList.remove("dark", "dark-2");
      if (themeMode === "dark2") {
        html.classList.add("dark-2");
      } else if (themeMode === "dark") {
        html.classList.add("dark");
      } else if (themeMode === "system" && mq.matches) {
        html.classList.add("dark");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [themeMode]);

  const handleClearUrl = useCallback(() => {
    setUrlInput("");
    setAnalysisError(null);
  }, [setUrlInput, setAnalysisError]);

  const triggerUrlValidation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput);
    } catch {
      setHasAnimationShake(true);
      setAnalysisError(
        "That doesn't look like a valid URL structure. Try pasting a full link starting with http:// or https://"
      );
      setTimeout(() => setHasAnimationShake(false), 450);
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalyzedMetadata(null);
    try {
      const res = await apiFetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error ||
            "The URL entered is private or unsupported by our stream grabbers."
        );
      setAnalyzedMetadata(data);
    } catch (err: any) {
      setHasAnimationShake(true);
      setAnalysisError(err.message);
      setTimeout(() => setHasAnimationShake(false), 450);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        setAnalysisError(null);
      }
    } catch {
      alert(
        "Unable to access system clipboard. Please paste manually using Ctrl+V or Command+V."
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" id="nexload-app-root">
      {/* ─── HEADER ─── */}
      <header className="border-b border-sand bg-cream sticky top-0 z-40 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none"
            onClick={() => setAnalyzedMetadata(null)}
          >
            <BrandLogo size={24} />
            <span className="font-bold tracking-wide text-ink text-base sm:text-lg">
              NexLoad
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-ink/5 border border-sand text-[10px] text-ink-light uppercase tracking-widest">
              v1.2.0
            </span>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* ─── MODE TOGGLE ─── */}
            <button
              onClick={() => {
                setAppMode(appMode === "video" ? "image" : "video");
                setAnalyzedMetadata(null);
                setAnalysisError(null);
              }}
              className={`px-2 sm:px-3 py-2 border border-transparent transition-all text-[10px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${
                appMode === "image"
                  ? "bg-amber/10 border-amber text-amber"
                  : "text-ink-muted hover:text-ink hover:bg-ink/5 hover:border-sand"
              }`}
              title={appMode === "video" ? "Switch to Image Download mode" : "Switch to Video Download mode"}
            >
              {appMode === "image" ? (
                <>
                  <FileImage className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Images</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Media</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("browser-panel-root");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-2 sm:px-3 py-2 text-ink-muted hover:text-ink hover:bg-ink/5 border border-transparent hover:border-sand transition-all text-[10px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-2 sm:px-3 py-2 text-ink-muted hover:text-ink hover:bg-ink/5 border border-transparent hover:border-sand transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAboutOpen(true)}
              className="px-2 sm:px-3 py-2 text-ink-muted hover:text-ink hover:bg-ink/5 border border-transparent hover:border-sand transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex px-2 sm:px-3 py-2 text-ink-muted hover:text-ink hover:bg-ink/5 border border-transparent hover:border-sand transition-all"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
            {activeJobs.length > 0 && (
              <div className="relative header-queue-dropdown-area">
                <button
                  onClick={() => setHeaderQueueOpen(!headerQueueOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 ml-1 sm:ml-3 border-l border-sand text-[9px] sm:text-[10px] text-ink/70 tracking-wider hover:text-ink transition-all cursor-pointer"
                >
                  <div
                    className={`w-2 h-2 ${
                      activeCount > 0
                        ? "bg-amber animate-pulse"
                        : failedCount > 0
                        ? "bg-red"
                        : "bg-ink/20"
                    }`}
                  />
                  <span className="whitespace-nowrap hidden sm:inline">
                    {activeCount > 0
                      ? `Downloading ${activeCount} file${activeCount > 1 ? "s" : ""}`
                      : failedCount > 0
                      ? `${failedCount} failed`
                      : "All tasks completed"}
                  </span>
                  <span className="whitespace-nowrap sm:hidden">
                    {activeCount > 0 ? `${activeCount}` : failedCount > 0 ? `${failedCount}` : "✓"}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-ink-muted transition-transform ${headerQueueOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {headerQueueOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-[95vw] sm:w-[480px] max-w-[95vw] card-brutalist bg-cream shadow-xl max-h-[60vh] sm:max-h-[400px] overflow-y-auto custom-scrollbar"
                    >
                      <div className="p-1 border-b border-sand flex items-center justify-between px-3 py-2">
                        <span className="text-[9px] uppercase tracking-widest text-ink-muted font-medium">Queue</span>
                        <span className="text-[9px] text-ink-muted bg-ink/5 px-2 py-0.5 border border-sand">{activeJobs.length} total</span>
                      </div>
                      <div className="flex flex-col gap-1 p-2">
                        {activeJobs.map((job) => (
                          <div
                            key={job.id}
                            className="p-2.5 flex items-start justify-between gap-2 hover:bg-ink/[0.02] rounded-sm transition-all"
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <img
                                src={job.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&fit=crop"}
                                alt={job.title}
                                className="w-10 h-7 object-cover bg-ink/5 shrink-0"
                                referrerPolicy="no-referrer-when-downgrade"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[7px] tracking-[0.15em] uppercase px-1 py-0.5 text-amber bg-amber/10 border border-amber/20">
                                    {job.platform}
                                  </span>
                                  {job.quality && (
                                    <span className="text-[7px] tracking-[0.1em] uppercase px-1 py-0.5 text-ink-muted bg-ink/5 border border-sand">
                                      {job.quality}
                                    </span>
                                  )}
                                  {job.fileSizeLabel && job.state === DownloadState.COMPLETED && (
                                    <span className="text-[7px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-1 py-0.5">
                                      ✓ {job.fileSizeLabel}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-[10px] text-ink/70 truncate">{job.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1 bg-ink/5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${job.progress}%` }}
                                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                                      className="bg-amber h-full"
                                    />
                                  </div>
                                  <span className="text-[8px] font-bold text-ink-light w-6 text-right">{Math.round(job.progress)}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {job.state === DownloadState.DOWNLOADING && (
                                <>
                                  {job.speedMbps && (
                                    <span className="flex items-center gap-1 text-[8px] text-ink-muted">
                                      <Gauge className="w-2 h-2" />
                                      {job.speedMbps} Mbps
                                    </span>
                                  )}
                                  {job.etaSeconds && (
                                    <span className="flex items-center gap-1 text-[8px] text-ink-muted">
                                      <Clock className="w-2 h-2" />
                                      {job.etaSeconds}s
                                    </span>
                                  )}
                                </>
                              )}
                              {job.state !== DownloadState.COMPLETED && job.state !== DownloadState.FAILED && (
                                <span className="text-[7px] px-1.5 py-0.5 bg-ink/5 border border-sand text-ink-muted uppercase tracking-wider">
                                  {job.state.toLowerCase().replace("_", " ")}
                                </span>
                              )}
                              {job.state === DownloadState.COMPLETED && job.downloadUrl && (
                                <button
                                  onClick={() => { window.location.href = job.downloadUrl; }}
                                  className="flex items-center gap-1 px-2 py-1 bg-amber hover:bg-ink text-white text-[7px] tracking-wider uppercase transition-all cursor-pointer"
                                >
                                  <Save className="w-2 h-2" /> Save
                                </button>
                              )}
                              {job.state === DownloadState.FAILED && (
                                <div className="flex flex-col items-end gap-0.5" title={job.error}>
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red/10 border border-red/20 text-red text-[7px] uppercase tracking-wider whitespace-nowrap">
                                    <AlertTriangle className="w-2 h-2" /> Failed
                                  </div>
                                  {job.error && (
                                    <span className="text-[6px] text-red/60 max-w-[140px] text-right truncate">{job.error}</span>
                                  )}
                                </div>
                              )}
                              {job.state !== DownloadState.COMPLETED && job.state !== DownloadState.FAILED && (
                                <button
                                  onClick={() => removeJob(job.id)}
                                  className="p-1 text-ink-muted hover:text-ink hover:bg-ink/5 transition-all cursor-pointer"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      {appMode === "image" ? (
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 flex flex-col gap-0 relative z-10">
          {/* ─── IMAGE HERO ─── */}
          <section
            className="text-center flex flex-col items-center gap-2 sm:gap-3 max-w-2xl mx-auto relative py-4 sm:py-6 md:py-10 overflow-hidden"
            id="image-hero-section"
          >
            <div className="hero-sun"><HeroImageSVG /></div>
            <div className="hero-moon"><HeroImageFrameSVG /></div>
            <GhostLoader />
            <BrandLogo size={40} />
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
              Image Extraction.
              <br />
              <span className="text-amber">Simplified.</span>
            </h1>
            <p className="text-xs sm:text-sm text-ink-light tracking-wide mt-1 px-4">
              "Grab any image. Instantly." &mdash; No Tracking &bull; No Ads.
            </p>
          </section>

          {/* ─── IMAGE DOWNLOADER ─── */}
          <section className="w-full max-w-3xl mx-auto pt-2 pb-12 sm:pb-20">
            <ImageDownloader />
          </section>
        </main>
      ) : (
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 flex flex-col gap-0 relative z-10">
        {/* ─── HERO ─── (cream section) */}
        <section
          className="text-center flex flex-col items-center gap-2 sm:gap-3 max-w-2xl mx-auto relative py-4 sm:py-6 md:py-10 overflow-hidden"
          id="brand-hero-section"
        >
          <div className="hero-sun"><HeroSunSVG /></div>
          <div className="hero-moon"><HeroMoonSVG /></div>
          <GhostLoader />
          <BrandLogo size={40} />
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
            Stream Extraction.
            <br />
            <span className="text-amber">Simplified.</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-light tracking-wide mt-1 px-4">
            "Download anything. Instantly." &mdash; No Tracking &bull; No Ads.
          </p>
        </section>

        {/* ─── URL INPUT ─── (cream section) */}
        <section className="w-full max-w-3xl mx-auto pb-12 sm:pb-20" id="input-control-section">
          <form
            onSubmit={triggerUrlValidation}
            className={`card-brutalist flex flex-col sm:flex-row gap-0 transition-all duration-300 ${
              hasAnimationShake
                ? "animate-shake border-red"
                : "focus-within:border-amber"
            }`}
          >
            <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b sm:border-b-0 sm:border-r border-sand">
              <Globe className="w-4 h-4 text-amber shrink-0" />
              <input
                type="text"
                placeholder="Paste any YouTube, TikTok, Instagram link..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setAnalysisError(null);
                }}
                className="w-full bg-transparent border-none text-sm text-ink/80 placeholder-ink-subtle/60 focus:outline-none focus:ring-0 leading-normal"
                id="url-paste-input"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  className="p-1 text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex w-full sm:w-auto gap-0 shrink-0">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="flex-1 sm:flex-none px-4 py-3 sm:py-3.5 bg-ink/5 border-r border-sand hover:bg-ink/10 text-ink-light hover:text-ink transition-all cursor-pointer flex items-center justify-center"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={isAnalyzing || !urlInput.trim()}
                className="flex-1 sm:flex-none px-6 sm:px-8 py-3 sm:py-3.5 bg-amber hover:bg-ink text-white text-xs tracking-[0.15em] uppercase transition-all cursor-pointer disabled:bg-ink/10 disabled:text-ink-muted disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-3 h-3 border border-current border-t-transparent animate-spin" />
                    Analyzing
                  </span>
                ) : (
                  "Acquire"
                )}
              </button>
            </div>
          </form>

          {analysisError && (
            <div className="mt-4 card-brutalist p-4 flex items-start gap-3 text-xs text-left max-w-3xl mx-auto border-red/30">
              <span className="text-red font-bold text-[10px] tracking-[0.2em] uppercase bg-red/10 px-2 py-1 border border-red/20 shrink-0">
                Invalid
              </span>
              <p className="leading-relaxed text-ink/70">
                {analysisError}
              </p>
            </div>
          )}

          <div className="mt-8">
            <SupportedPlatforms currentUrl={urlInput} />
          </div>
        </section>

        {/* ─── LOADING SKELETON ─── */}
        {isAnalyzing && (
          <section className="w-full max-w-4xl mx-auto card-brutalist p-6 md:p-8 animate-pulse mb-20">
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              <div className="lg:col-span-4 aspect-video bg-ink/5" />
              <div className="lg:col-span-6 flex flex-col justify-between py-2">
                <div>
                  <div className="h-2.5 bg-ink/5 w-20 mb-3" />
                  <div className="h-5 bg-ink/5 w-3/4 mb-4" />
                  <div className="h-3 bg-ink/5 w-1/2 mb-2" />
                  <div className="h-3 bg-ink/5 w-5/6" />
                </div>
                <div className="h-10 bg-ink/5 w-full mt-6" />
              </div>
            </div>
          </section>
        )}

        {/* ─── METADATA PREVIEW ─── */}
        {!isAnalyzing && analyzedMetadata && (
          <section className="w-full max-w-5xl mx-auto pb-20" id="preview-panel-section">
            <MetadataPreview />
          </section>
        )}

        {/* ─── SEARCH & BROWSE ─── (cream section) */}
        <section
          className="w-full py-12 sm:py-20 border-t border-sand"
          id="search-panel-section"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 mb-6 sm:mb-8 text-center">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-ink/80">
                Discover &amp; Grab Streams
              </h2>
              <p className="text-[11px] sm:text-xs text-ink-muted max-w-md px-4">
                Search live tags or browse historic completions instantly, with
                single-click auto-fill triggers.
              </p>
            </div>
            <SearchAndBrowse />
          </div>
        </section>

      </main>
      )}

      {/* ─── TRUST CARDS ─── (burnt-orange section, full-width) */}
      <section className="w-full bg-burnt-orange py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {[
              {
                label: "Privacy",
                title: "Zero Tracker Policy",
                desc: "No tracking tags, zero telemetry profiling, or device fingerprinting grids. Ever.",
              },
              {
                label: "Speed",
                title: "Transmux Engine",
                desc: "Bypasses platform cache limits to assemble dynamic segment streams in under 750ms.",
              },
              {
                label: "Secure",
                title: "Sandboxed I/O",
                desc: "Fully protected workspace proxy protecting raw client IP addresses and headers.",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="p-5 sm:p-6 flex flex-col gap-3 sm:gap-4 border-t sm:border-t sm:border-l-0 sm:first:border-l border-sand/30 first:border-t"
              >
                <span className="label-meta text-cream/70">{card.label}</span>
                <h5 className="text-sm font-bold text-cream">
                  {card.title}
                </h5>
                <p className="text-xs text-cream/70 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-sand bg-cream transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size={18} />
            <span className="text-sm font-bold tracking-wide text-ink">NexLoad</span>
            <span className="text-[10px] text-ink-muted tracking-wider hidden sm:inline">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-[10px] text-ink-muted tracking-wider text-center sm:text-right">
            Stream Extraction. Simplified. &mdash; No Tracking &bull; No Ads.
          </p>
        </div>
      </footer>

      {/* ─── MODALS ─── */}
      <SettingsModal />
      <AboutModal />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DownloaderDashboard />
    </QueryClientProvider>
  );
}
