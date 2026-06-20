/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
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
  Shield,
  Zap,
  Lock,
} from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
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

  const [hasAnimationShake, setHasAnimationShake] = useState<boolean>(false);

  // Clear url bar
  const handleClearUrl = () => {
    setUrlInput("");
    setAnalysisError(null);
  };

  // Keyboard and paste triggered validation
  const triggerUrlValidation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    // Simple URL validation
    try {
      new URL(urlInput);
    } catch {
      setHasAnimationShake(true);
      setAnalysisError("That doesn't look like a valid URL structure. Try pasting a full link starting with http:// or https://");
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
      if (!res.ok) {
        throw new Error(data.error || "The URL entered is private or unsupported by our stream grabbers.");
      }

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
      alert("Unable to access system clipboard. Please paste manually using Ctrl+V or Command+V.");
    }
  };

  // Sync themeMode to data-theme attribute on <html>
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

    const applyTheme = () => {
      const effective = themeMode === "system"
        ? (mediaQuery.matches ? "light" : "dark")
        : themeMode;
      document.documentElement.setAttribute("data-theme", effective);
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [themeMode]);

  return (
    <div className="min-h-screen relative overflow-hidden pb-32" id="nexload-app-root">
      
      {/* Background Cosmic Radial Vignettes */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      {/* FIXED PLATFORM-AWARE HEADER (Part 5.1) */}
      <header className="border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setAnalyzedMetadata(null)}>
            <BrandLogo size={30} />
            <span className="font-sans font-bold tracking-tight text-white text-base">
              NexLoad
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-500">
              v1.2.0 • build
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick action buttons */}
            <button
              onClick={() => {
                const searchSec = document.getElementById("browser-panel-root");
                if (searchSec) searchSec.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 rounded-xl transition-all font-mono text-xs flex items-center gap-1 cursor-pointer focus:outline-none"
              title="Search Contents panel"
            >
              <Search className="w-4 h-4" />
              <span className="hidden md:inline">Search Layer</span>
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer focus:outline-none"
              title="Configurations Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setAboutOpen(true)}
              className="p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 rounded-xl transition-all cursor-pointer focus:outline-none"
              title="Platform documentation Help FAQ"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 rounded-xl transition-all"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>

        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 md:pt-20 flex flex-col gap-12 relative z-10">
        
        {/* HERO BRAND UNIT */}
        <section className="text-center flex flex-col items-center gap-2 max-w-xl mx-auto" id="brand-hero-section">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/10 border border-brand-accent/25 rounded-full text-[10px] font-mono tracking-wider text-brand-accent uppercase mb-2 shadow-[0_0_15px_rgba(124,58,237,0.12)]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
            V1.2.0 Next-Gen Stream Core
          </div>
          <BrandLogo size={48} className="mb-2 animate-pulse" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Stream Extraction. <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-violet-400 to-fuchsia-400">Simplified.</span>
          </h1>
          <p className="text-sm text-zinc-400 tracking-wide font-mono mt-1">
            "Download anything. Instantly." • No Tracking • No Ads.
          </p>
        </section>

        {/* DYNAMIC URL INPUT & PASTE GRID (Part 5.2) */}
        <section className="max-w-3xl w-full mx-auto" id="input-control-section">
          <form
            onSubmit={triggerUrlValidation}
            className={`flex flex-col md:flex-row gap-3 p-2 bg-black/40 border rounded-3xl transition-all duration-400 relative ${
              hasAnimationShake 
                ? "animate-shake border-red-500/70 shadow-[0_0_25px_rgba(239,68,68,0.3)] bg-red-950/5" 
                : "border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] hover:border-brand-accent/30 hover:shadow-[0_20px_50px_rgba(124,58,237,0.08)]"
            } focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/20 focus-within:shadow-[0_0_35px_rgba(124,58,237,0.18)]`}
          >
            <div className="flex-1 flex items-center gap-3 pl-4 py-2 bg-zinc-950/20 rounded-2xl border border-transparent focus-within:bg-zinc-950/45 transition-all">
              <Globe className="w-4.5 h-4.5 text-brand-accent shrink-0" />
              <input
                type="text"
                placeholder="Paste any YouTube, TikTok, Instagram, Reddit, SoundCloud link..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setAnalysisError(null);
                }}
                className="w-full bg-transparent border-none text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-0 leading-normal"
                id="url-paste-input"
              />
              
              {urlInput && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  className="p-1.5 mr-1 text-zinc-500 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-colors focus:outline-none cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="bg-zinc-900/80 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white p-3 md:px-4 rounded-2xl flex items-center justify-center transition-all duration-200 focus:outline-none cursor-pointer shrink-0"
                title="Paste from system clipboard"
              >
                <Clipboard className="w-4 h-4 mr-0 md:mr-1.5" />
                <span className="hidden md:inline text-xs font-mono font-bold tracking-wider">PASTE</span>
              </button>
              
              <button
                type="submit"
                disabled={isAnalyzing || !urlInput.trim()}
                className="bg-brand-accent hover:opacity-95 text-white font-extrabold text-xs font-mono uppercase tracking-widest px-7 py-3.5 rounded-2xl cursor-pointer select-none transition-all duration-200 focus:outline-none shrink-0 flex items-center justify-center disabled:bg-zinc-950 disabled:text-zinc-650 disabled:border-zinc-900/60 disabled:cursor-not-allowed shadow-lg shadow-brand-accent/20"
              >
                {isAnalyzing ? "Analyzing..." : "Acquire"}
              </button>
            </div>
          </form>

          {/* Validation/Analysis Error Box */}
          {analysisError && (
            <div className="mt-4.5 p-4.5 bg-red-950/10 border border-red-900/35 rounded-2xl flex items-start gap-3.5 text-red-250 text-xs text-left max-w-3xl mx-auto shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <span className="text-red-400 font-mono font-black uppercase tracking-wider bg-red-950/40 px-2.5 py-0.5 rounded border border-red-500/15 text-[10px]">
                Invalid
              </span>
              <p className="leading-relaxed font-sans mt-0.5 font-medium">{analysisError}</p>
            </div>
          )}

          {/* Supported platform active indicator chips */}
          <div className="mt-6">
            <SupportedPlatforms currentUrl={urlInput} />
          </div>
        </section>

        {/* LOADING STATE SKELETON */}
        {isAnalyzing && (
          <section className="w-full max-w-4xl mx-auto bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-6 md:p-8 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              <div className="lg:col-span-4 aspect-video bg-zinc-900 rounded-2xl mb-4" />
              <div className="lg:col-span-6 flex flex-col justify-between py-2">
                <div>
                  <div className="h-2.5 bg-zinc-800 rounded-full w-20 mb-3" />
                  <div className="h-5 bg-zinc-800 rounded-full w-3/4 mb-4" />
                  <div className="h-3 bg-zinc-800 rounded-full w-1/2 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded-full w-5/6" />
                </div>
                <div className="h-10 bg-zinc-800 rounded-xl w-full mt-6" />
              </div>
            </div>
          </section>
        )}

        {/* DYNAMIC RESOLVED PREVIEW PANEL (Part 5.3) */}
        {!isAnalyzing && analyzedMetadata && (
          <section className="w-full max-w-5xl mx-auto" id="preview-panel-section">
            <MetadataPreview />
          </section>
        )}

        {/* FULL IN-APP DISPATCH SEARCH PANEL & HISTORY (Part 4) */}
        <section className="w-full border-t border-zinc-900/80 pt-10" id="search-panel-section">
          <div className="flex flex-col items-center gap-2 mb-4 text-center">
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 font-sans">
              Discover & Grab Streams
            </h2>
            <p className="text-xs text-zinc-500 max-w-md">
              Search live tags or browse historic completions instantly, with single-click auto-fill triggers.
            </p>
          </div>
          <SearchAndBrowse />
        </section>

        {/* TRUST ACCENT CARD STATS (Optional visual rhythm) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left border-t border-zinc-900/40 pt-12 max-w-5xl mx-auto mb-14">
          <div className="glass-panel-interactive flex gap-4 items-start p-5 rounded-2xl border border-zinc-900/60 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/10 transition-colors duration-500" />
            <Shield className="w-5.5 h-5.5 text-brand-accent shrink-0 relative z-10" />
            <div className="relative z-10">
              <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200 mb-1.5">Zero Tracker Policy</h5>
              <p className="text-[11px] text-zinc-450 leading-relaxed">No tracking tags, zero telemetry profiling, or device fingerprinting grids. Ever.</p>
            </div>
          </div>

          <div className="glass-panel-interactive flex gap-4 items-start p-5 rounded-2xl border border-zinc-900/60 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/10 transition-colors duration-500" />
            <Zap className="w-5.5 h-5.5 text-brand-accent shrink-0 relative z-10" />
            <div className="relative z-10">
              <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200 mb-1.5">Transmux Engine</h5>
              <p className="text-[11px] text-zinc-450 leading-relaxed">Bypasses platform cache limits to assemble dynamic segment streams in under 750ms.</p>
            </div>
          </div>

          <div className="glass-panel-interactive flex gap-4 items-start p-5 rounded-2xl border border-zinc-900/60 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/10 transition-colors duration-500" />
            <Lock className="w-5.5 h-5.5 text-brand-accent shrink-0 relative z-10" />
            <div className="relative z-10">
              <h5 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200 mb-1.5">Sandboxed I/O</h5>
              <p className="text-[11px] text-zinc-450 leading-relaxed">Fully protected workspace proxy protecting raw client IP addresses and headers.</p>
            </div>
          </div>
        </section>

      </main>

      {/* BOTTOM FLOATING TASK QUEUE DRAWER (Part 5.1 & Part 11) */}
      <QueueDrawer />

      {/* OVERLAY MODALS */}
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
