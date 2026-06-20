/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppStore } from "./stores/useAppStore";
import { BrandLogo } from "./components/BrandLogo";
import { SupportedPlatforms } from "./components/SupportedPlatforms";
import { MetadataPreview } from "./components/MetadataPreview";
import { SearchAndBrowse } from "./components/SearchAndBrowse";
import { QueueDrawer } from "./components/QueueDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { AboutModal } from "./components/AboutModal";
import {
  Search,
  Settings,
  HelpCircle,
  Github,
  Globe,
  Clipboard,
  X,
} from "lucide-react";

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
  } = useAppStore();

  const [hasAnimationShake, setHasAnimationShake] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const effective =
        themeMode === "system"
          ? mq.matches
            ? "light"
            : "dark"
          : themeMode;
      document.documentElement.setAttribute("data-theme", effective);
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
      const res = await fetch("/api/analyze-url", {
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
    <div
      className="min-h-screen relative overflow-hidden pb-32"
      id="nexload-app-root"
    >
      {/* ─── SCANLINE OVERLAY ─── */}
      <div className="scanline-overlay" />

      {/* ─── FLOATING WATERMARK ─── */}
      <div
        className="watermark"
        style={{ top: "5%", left: "-4%", transform: `translateY(${scrollY * 0.06}px)` }}
      >
        NEXLOAD
      </div>
      <div
        className="watermark"
        style={{ bottom: "5%", right: "-4%", transform: `translateY(${-scrollY * 0.04}px)` }}
      >
        STREAM
      </div>

      {/* ─── FLOATING VERTICAL BADGES ─── */}
      <div className="badge-vertical badge-left">
        <span className="badge-line" />
        <span>CYBERPUNK</span>
      </div>
      <div className="badge-vertical badge-right">
        <span>FUTURISTIC</span>
        <span className="badge-line" />
      </div>

      {/* ─── HEADER ─── */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setAnalyzedMetadata(null)}
          >
            <BrandLogo size={28} />
            <span className="font-display font-bold tracking-[0.15em] text-white text-base uppercase">
              NexLoad
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] font-mono text-white/30 tracking-wider uppercase">
              v1.2.0
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const el = document.getElementById("browser-panel-root");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all font-display text-xs tracking-widest uppercase flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search</span>
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAboutOpen(true)}
              className="px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ─── MAIN ─── */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-16 md:pt-24 flex flex-col gap-16 relative z-10">
        {/* ─── HERO ─── */}
        <section
          className="text-center flex flex-col items-center gap-4 max-w-2xl mx-auto"
          id="brand-hero-section"
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#ff5b00]/10 border border-[#ff5b00]/25 text-[10px] font-mono tracking-[0.25em] text-[#ff5b00] uppercase">
            <span className="w-1.5 h-1.5 bg-[#ff5b00] animate-pulse" />
            V1.2.0 Next-Gen Stream Core
          </div>
          <BrandLogo size={52} className="mb-1" />
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-white leading-[1.05] uppercase">
            Stream Extraction.
            <br />
            <span className="text-[#ff5b00]">Simplified.</span>
          </h1>
          <p className="text-sm text-white/40 font-body tracking-wide mt-1">
            "Download anything. Instantly." &mdash; No Tracking &bull; No Ads.
          </p>
        </section>

        {/* ─── URL INPUT ─── */}
        <section className="w-full max-w-3xl mx-auto" id="input-control-section">
          <form
            onSubmit={triggerUrlValidation}
            className={`flex flex-col md:flex-row gap-0 border transition-all duration-300 relative ${
              hasAnimationShake
                ? "animate-shake border-red-500/70 bg-red-500/5"
                : "border-white/10 bg-white/[0.015] hover:border-white/20 focus-within:border-[#ff5b00] focus-within:bg-[#ff5b00]/[0.02]"
            }`}
          >
            <div className="flex-1 flex items-center gap-3 px-4 py-3 border-b md:border-b-0 md:border-r border-white/5">
              <Globe className="w-4 h-4 text-[#ff5b00] shrink-0" />
              <input
                type="text"
                placeholder="Paste any YouTube, TikTok, Instagram, Reddit, SoundCloud link..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setAnalysisError(null);
                }}
                className="w-full bg-transparent border-none text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-0 leading-normal font-body"
                id="url-paste-input"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  className="p-1 text-white/30 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-0 shrink-0">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-4 py-3 bg-white/5 border-r border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={isAnalyzing || !urlInput.trim()}
                className="px-8 py-3 bg-[#ff5b00] hover:bg-[#e65200] text-white font-display text-xs tracking-[0.15em] uppercase transition-all cursor-pointer disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
                    Analyzing
                  </span>
                ) : (
                  "Acquire"
                )}
              </button>
            </div>
          </form>

          {analysisError && (
            <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 flex items-start gap-3 text-xs text-left max-w-3xl mx-auto">
              <span className="text-red-400 font-mono font-bold text-[9px] tracking-[0.2em] uppercase bg-red-500/10 px-2 py-1 border border-red-500/15 shrink-0">
                Invalid
              </span>
              <p className="leading-relaxed font-body text-red-300/80">
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
          <section className="w-full max-w-4xl mx-auto border border-white/5 p-6 md:p-8 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              <div className="lg:col-span-4 aspect-video bg-white/5" />
              <div className="lg:col-span-6 flex flex-col justify-between py-2">
                <div>
                  <div className="h-2.5 bg-white/5 w-20 mb-3" />
                  <div className="h-5 bg-white/5 w-3/4 mb-4" />
                  <div className="h-3 bg-white/5 w-1/2 mb-2" />
                  <div className="h-3 bg-white/5 w-5/6" />
                </div>
                <div className="h-10 bg-white/5 w-full mt-6" />
              </div>
            </div>
          </section>
        )}

        {/* ─── METADATA PREVIEW ─── */}
        {!isAnalyzing && analyzedMetadata && (
          <section className="w-full max-w-5xl mx-auto" id="preview-panel-section">
            <MetadataPreview />
          </section>
        )}

        {/* ─── SEARCH & BROWSE ─── */}
        <section
          className="w-full border-t border-white/5 pt-10"
          id="search-panel-section"
        >
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <h2 className="text-lg font-display font-bold tracking-[0.15em] text-white/80 uppercase">
              Discover &amp; Grab Streams
            </h2>
            <p className="text-xs text-white/30 font-body max-w-md">
              Search live tags or browse historic completions instantly, with
              single-click auto-fill triggers.
            </p>
          </div>
          <SearchAndBrowse />
        </section>

        {/* ─── TRUST CARDS ─── */}
        <section className="grid grid-cols-1 md:grid-cols-3 border-t border-white/5 pt-12 max-w-5xl mx-auto mb-14">
          {[
            {
              label: "PRIVACY",
              title: "Zero Tracker Policy",
              desc: "No tracking tags, zero telemetry profiling, or device fingerprinting grids. Ever.",
            },
            {
              label: "SPEED",
              title: "Transmux Engine",
              desc: "Bypasses platform cache limits to assemble dynamic segment streams in under 750ms.",
            },
            {
              label: "SECURE",
              title: "Sandboxed I/O",
              desc: "Fully protected workspace proxy protecting raw client IP addresses and headers.",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="panel-hover p-6 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-white/5 first:border-l-0"
            >
              <span className="text-[10px] font-display tracking-[0.3em] text-[#ff5b00]/60 uppercase">
                {card.label}
              </span>
              <h5 className="text-sm font-display font-bold tracking-[0.1em] text-white/70 uppercase">
                {card.title}
              </h5>
              <p className="text-xs text-white/35 font-body leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </section>
      </main>

      {/* ─── QUEUE DRAWER ─── */}
      <QueueDrawer />

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
