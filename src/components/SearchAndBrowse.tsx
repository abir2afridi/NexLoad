/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { getHistoryRecords, deleteHistoryRecord, clearAllHistory, HistoryRecord } from "../lib/db";
import { Search, Flame, History, Trash2, RefreshCw } from "lucide-react";

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

  const [trendingItems, setTrendingItems] = useState<SearchResult[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);

  const loadHistory = async () => {
    const list = await getHistoryRecords();
    setHistoryItems(list);
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

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
      },
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
    setUrlInput(url);
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalyzedMetadata(null);

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

  const TabButton = ({
    tab,
    icon: Icon,
    label,
  }: {
    tab: typeof activeTab;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => (
    <button
      onClick={() => {
        if (tab === "search" && searchResults.length === 0) {
          setActiveTab("search");
          setSearchQuery("Latest Synthwave Mixes");
          setTimeout(() => handleSearchCommit(), 50);
        } else {
          setActiveTab(tab);
        }
      }}
      className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
        activeTab === tab
          ? "border-amber text-ink"
          : "border-transparent text-ink-muted hover:text-ink-light"
      }`}
    >
      <Icon className={`w-3.5 h-3.5 ${activeTab === tab ? "text-amber" : "text-ink-muted"}`} />
      <span className="text-[10px] uppercase tracking-[0.2em]">{label}</span>
    </button>
  );

  const ResultCard = ({ item }: { item: SearchResult; key?: React.Key }) => (
    <div
      onClick={() => selectMediaItem(item.url)}
      className="card-brutalist bg-cream flex flex-col justify-between cursor-pointer"
    >
      <div>
        <div className="relative aspect-video bg-ink/[0.02]">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="absolute bottom-2 right-2 bg-cream-dark px-2 py-0.5 border border-sand text-[9px] text-ink-light">
            {item.durationLabel}
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <span className="text-[8px] tracking-[0.25em] text-amber uppercase block mb-1.5">
            {item.platform}
          </span>
          <h4 className="text-ink/70 text-sm leading-snug line-clamp-2">
            {item.title}
          </h4>
          <p className="text-ink-muted text-xs mt-2">{item.author}</p>
        </div>
      </div>
      <div className="p-3 sm:p-4 pt-0 flex justify-between items-center text-[9px] text-ink-muted">
        <span>{item.viewsLabel}</span>
        <span>{item.uploadDateLabel}</span>
      </div>
    </div>
  );

  return (
    <div className="w-full mt-6" id="browser-panel-root">
      {/* Search Bar */}
      <form
        onSubmit={handleSearchCommit}
        className="card-brutalist flex gap-0 max-w-2xl mx-auto mb-6 sm:mb-10 focus-within:border-amber transition-all"
        id="in-app-search-form"
      >
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            placeholder="Search YouTube, SoundCloud, Vimeo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none py-3 pl-10 pr-4 text-sm text-ink/80 placeholder-ink-subtle/60 focus:outline-none"
          />
          <Search className="absolute left-3 w-4 h-4 text-ink-muted" />
        </div>
        <button
          type="submit"
          className="bg-amber hover:bg-ink text-white px-4 sm:px-6 py-3 text-xs tracking-[0.15em] uppercase transition-all flex items-center gap-1.5"
        >
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </form>

      {/* Tabs */}
      <div className="flex border-b border-sand justify-center w-full mb-6 sm:mb-8 overflow-x-auto">
        <div className="flex gap-4 sm:gap-8 px-2">
          <TabButton tab="trending" icon={Flame} label="Trending" />
          <TabButton tab="search" icon={Search} label="Results" />
          <TabButton tab="history" icon={History} label="History" />
        </div>
      </div>

      {/* Panels */}
      <div className="w-full">
        {/* Trending */}
        {activeTab === "trending" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-sand/30">
            {trendingItems.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Search Results */}
        {activeTab === "search" && (
          <div>
            {isSearching ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-amber/30 border-t-amber animate-spin" />
                <span className="text-sm text-ink-muted">Parsing live search indexer databases...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="w-10 h-10 text-ink/10 mx-auto mb-4" />
                <h4 className="text-ink-light text-sm">
                  No active search outcomes yet
                </h4>
                <p className="text-ink-muted text-xs mt-1 max-w-sm mx-auto">
                  Type any keywords above to search and parse directly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-sand/30">
                {searchResults.map((item) => (
                  <ResultCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="max-w-4xl mx-auto">
            {historyItems.length === 0 ? (
              <div className="py-16 text-center card-brutalist-static">
                <History className="w-10 h-10 text-ink/10 mx-auto mb-4" />
                <h4 className="text-ink-light text-sm">
                  No downloads completed yet
                </h4>
                <p className="text-ink-muted text-xs mt-1">
                  When you successfully download items, they will log here securely.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-4 mb-2">
                  <span className="text-[10px] text-ink-muted">
                    Showing {historyItems.length} Saved Records
                  </span>
                  <button
                    onClick={handlePruneBulkHistory}
                    className="text-[10px] text-red uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer hover:text-red/70"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                </div>

                <div className="flex flex-col gap-px bg-sand/30">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="card-brutalist-static bg-cream p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-14 sm:w-16 md:w-20 aspect-video object-cover bg-ink/[0.02] border border-sand shrink-0"
                           referrerPolicy="no-referrer-when-downgrade"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] tracking-[0.25em] text-ink-muted bg-ink/[0.03] px-2 py-0.5 border border-sand/20 mb-1 inline-block uppercase">
                            {item.platform}
                          </span>
                          <h4 className="text-sm text-ink/70 truncate">
                            {item.title}
                          </h4>
                          <p className="text-[10px] text-ink-muted truncate mt-0.5">
                            {item.author} &bull; {item.durationLabel} &bull;{" "}
                            <span className="text-amber">{item.quality}</span>{" "}
                            <span className="text-ink-muted">({item.format.toUpperCase()})</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => selectMediaItem(item.url)}
                          title="Parse again"
                          className="p-2.5 border border-sand hover:border-amber/40 text-ink-muted hover:text-ink transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePruneSingleHistory(item.id)}
                          title="Delete record"
                          className="p-2.5 border border-sand/20 hover:border-red/30 hover:text-red text-ink-muted transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
