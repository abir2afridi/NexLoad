/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { getHistoryRecords, deleteHistoryRecord, clearAllHistory, HistoryRecord } from "../lib/db";
import { Search, Flame, History, Play, Trash2, ArrowRight, Video, ExternalLink, RefreshCw } from "lucide-react";

interface SearchResult {
  id: string;
  url: string;
  platform: string;
  title: string;
  thumbnail: string;
  author: string;
  durationLabel: string;
  durationSeconds: number;
  viewsLabel?: string;
  uploadDateLabel?: string;
}

export const SearchAndBrowse: React.FC = () => {
  const { setUrlInput, setAnalyzedMetadata, setAnalyzing, setAnalysisError } = useAppStore();

  const [activeTab, setActiveTab] = useState<"search" | "trending" | "history">("trending");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Trending dummy items
  const [trendingItems, setTrendingItems] = useState<SearchResult[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);

  // Load History from Dexie DB
  const loadHistory = async () => {
    const list = await getHistoryRecords();
    setHistoryItems(list);
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  // Generate some beautiful initial trending topics
  useEffect(() => {
    setTrendingItems([
      {
        id: "trend_1",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        platform: "youtube",
        title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=480&fit=crop&q=80",
        author: "Rick Astley",
        durationLabel: "3:32",
        durationSeconds: 212,
        viewsLabel: "1.4B views",
        uploadDateLabel: "14 years ago",
      },
      {
        id: "trend_2",
        url: "https://www.soundcloud.com/chill-hop-beats/lofi-relaxing",
        platform: "soundcloud",
        title: "Lofi Study Beats - Chilled Relaxing Session 2026",
        thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=480&fit=crop&q=80",
        author: "Lofi Cafe",
        durationLabel: "12:45",
        durationSeconds: 765,
        viewsLabel: "2.5M plays",
        uploadDateLabel: "3 weeks ago",
      },
      {
        id: "trend_3",
        url: "https://www.vimeo.com/71239851",
        platform: "vimeo",
        title: "Symphony of Lights - Atmospheric Cinematic Experience",
        thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=480&fit=crop&q=80",
        author: "Visual Arts Lab",
        durationLabel: "4:15",
        durationSeconds: 255,
        viewsLabel: "840K views",
        uploadDateLabel: "5 months ago",
      }
    ]);
  }, []);

  const handleSearchCommit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setActiveTab("search");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          platform: platformFilter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Search pipeline went into fallback limit.");
      }

      setSearchResults(data);
    } catch (err: any) {
      alert(`Search failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const selectMediaItem = async (url: string) => {
    // Fill main address box
    setUrlInput(url);
    
    // Automatically trigger immediate fetching
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalyzedMetadata(null);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const res = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch remote metadata.");
      }

      setAnalyzedMetadata(data);
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePruneSingleHistory = async (id: string) => {
    await deleteHistoryRecord(id);
    loadHistory();
  };

  const handlePruneBulkHistory = async () => {
    if (confirm("Are you sure you want to clear your local download history? This action is irreversible.")) {
      await clearAllHistory();
      loadHistory();
    }
  };

  return (
    <div className="w-full mt-6" id="browser-panel-root">
      
      {/* Search Bar Block */}
      <form onSubmit={handleSearchCommit} className="flex gap-2.5 max-w-2xl mx-auto mb-10 p-1 bg-zinc-950/50 border border-zinc-900/60 rounded-2xl focus-within:border-brand-accent/60 focus-within:ring-2 focus-within:ring-brand-accent/15 transition-all duration-300 shadow-xl" id="in-app-search-form">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            placeholder="Search directly on YouTube, SoundCloud, Vimeo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none outline-none focus:ring-0 leading-normal"
          />
          <Search className="absolute left-4 w-4.5 h-4.5 text-zinc-500" />
        </div>
        <button
          type="submit"
          className="bg-brand-accent hover:opacity-95 text-white px-6 py-3 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 focus:outline-none cursor-pointer shadow-lg shadow-brand-accent/10 hover:scale-[1.01]"
        >
          {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Tabs list */}
      <div className="flex border-b border-zinc-900 justify-center w-full mb-8">
        <div className="flex gap-8 text-xs font-mono uppercase tracking-wider font-bold">
          <button
            onClick={() => setActiveTab("trending")}
            className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
              activeTab === "trending"
                ? "border-brand-accent text-white font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Flame className="w-4 h-4 text-brand-accent" />
            Trending Content
          </button>
          
          <button
            onClick={() => {
              if (searchResults.length > 0) setActiveTab("search");
              else {
                setActiveTab("search");
                setSearchQuery("Latest Synthwave Mixes");
                setTimeout(() => handleSearchCommit(), 50);
              }
            }}
            className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
              activeTab === "search"
                ? "border-brand-accent text-white font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Search className="w-4 h-4 text-brand-accent" />
            Search Results
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer relative ${
              activeTab === "history"
                ? "border-brand-accent text-white font-extrabold"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <History className="w-4 h-4 text-brand-accent" />
            Download History
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="w-full">
        {/* Trending Tab */}
        {activeTab === "trending" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingItems.map((item) => (
              <div
                key={item.id}
                onClick={() => selectMediaItem(item.url)}
                className="group glass-panel-interactive rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2.5 right-2.5 bg-zinc-950/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold text-zinc-350 border border-zinc-800/80">
                      {item.durationLabel}
                    </div>
                  </div>
                  <div className="p-4">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-brand-accent font-bold block mb-1.5">
                      {item.platform}
                    </span>
                    <h4 className="text-zinc-200 font-semibold text-sm leading-snug group-hover:text-brand-accent transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-zinc-500 text-xs mt-2 font-medium">{item.author}</p>
                  </div>
                </div>
                <div className="p-4 pt-0 flex justify-between items-center text-[10.5px] font-mono text-zinc-500">
                  <span>{item.viewsLabel}</span>
                  <span>{item.uploadDateLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search Results Tab */}
        {activeTab === "search" && (
          <div>
            {isSearching ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                <span className="text-sm font-mono text-zinc-500">Parsing live search indexer databases...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                <h4 className="text-zinc-300 font-medium">No active search outcomes yet</h4>
                <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
                  Type any keywords above (e.g. "Rick Astley") to search and parse directly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectMediaItem(item.url)}
                    className="group glass-panel-interactive rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between transform hover:-translate-y-1 transition-all duration-300"
                  >
                    <div>
                      <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2.5 right-2.5 bg-zinc-950/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold text-zinc-350 border border-zinc-800/80">
                          {item.durationLabel}
                        </div>
                      </div>
                      <div className="p-4">
                        <span className="text-[9px] uppercase font-mono tracking-widest text-brand-accent font-bold block mb-1.5">
                          {item.platform}
                        </span>
                        <h4 className="text-zinc-200 font-semibold text-sm leading-snug group-hover:text-brand-accent transition-colors line-clamp-2">
                          {item.title}
                        </h4>
                        <p className="text-zinc-500 text-xs mt-2 font-medium">{item.author}</p>
                      </div>
                    </div>
                    <div className="p-4 pt-0 flex justify-between items-center text-[10.5px] font-mono text-zinc-500">
                      <span>{item.viewsLabel || "84.2K views"}</span>
                      <span>{item.uploadDateLabel || "Recently parsed"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Download History Tab */}
        {activeTab === "history" && (
          <div className="max-w-4xl mx-auto">
            {historyItems.length === 0 ? (
              <div className="py-16 text-center bg-zinc-950/20 border border-zinc-900/60 rounded-3xl">
                <History className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                <h4 className="text-zinc-300 font-medium">No downloads completed yet</h4>
                <p className="text-zinc-500 text-xs mt-1">
                  When you successfully download video/audio items, they will log here securely.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-4 mb-2">
                  <span className="text-xs text-zinc-500 font-mono">
                    Showing {historyItems.length} Saved Records
                  </span>
                  <button
                    onClick={handlePruneBulkHistory}
                    className="text-xs font-mono text-red-400 hover:text-red-300 uppercase font-bold focus:outline-none transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All Logs
                  </button>
                </div>

                 <div className="flex flex-col gap-2.5">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="glass-panel-interactive rounded-2xl p-4 flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-16 md:w-20 aspect-video object-cover rounded-xl bg-zinc-950 border border-zinc-900 shadow-inner"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800/60 mb-1 inline-block">
                            {item.platform}
                          </span>
                          <h4 className="text-sm font-bold truncate text-zinc-100">
                            {item.title}
                          </h4>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {item.author} • {item.durationLabel} • <span className="font-mono text-[10.5px] font-semibold text-brand-accent">{item.quality}</span> <span className="font-mono text-[10.5px] text-zinc-400">({item.format.toUpperCase()})</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Instant Redownload block */}
                        <button
                          onClick={() => selectMediaItem(item.url)}
                          title="Parse resource link again"
                          className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-brand-accent/40 rounded-2xl text-zinc-400 hover:text-white transition-all duration-200 focus:outline-none cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePruneSingleHistory(item.id)}
                          title="Purge database record"
                          className="p-3 bg-zinc-900/40 border border-zinc-900 hover:border-red-900 hover:bg-red-950/20 hover:text-red-450 rounded-2xl text-zinc-500 transition-all duration-200 focus:outline-none cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
