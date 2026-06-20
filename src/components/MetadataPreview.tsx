/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { addHistoryRecord } from "../lib/db";
import { DownloadState, QueueItem } from "../types";
import { AnimatePresence, motion } from "motion/react";
import {
  Calendar,
  Clock,
  Eye,
  ThumbsUp,
  Download,
  CheckCircle,
  HelpCircle,
  Video,
  Music,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const MetadataPreview: React.FC = () => {
  const {
    analyzedMetadata,
    setAnalyzedMetadata,
    addJob,
    setQueueExpanded,
    settings,
  } = useAppStore();

  const [selectedFormatId, setSelectedFormatId] = useState<string>("");
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!analyzedMetadata) return null;

  // Set default format once loaded
  if (!selectedFormatId && analyzedMetadata.formats.length > 0) {
    setSelectedFormatId(analyzedMetadata.recommendedFormatId || analyzedMetadata.formats[0].id);
  }

  // Auto-populate playlist items selection
  useEffect(() => {
    if (analyzedMetadata.playlistItems) {
      setSelectedPlaylistIds(analyzedMetadata.playlistItems.map((item) => item.id));
    } else {
      setSelectedPlaylistIds([]);
    }
  }, [analyzedMetadata]);

  const selectedFormat = analyzedMetadata.formats.find((f) => f.id === selectedFormatId);

  const toggleChapter = (index: number) => {
    setSelectedChapters((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleDownloadTrigger = async () => {
    if (!selectedFormat) return;
    setIsSubmitting(true);

    try {
      if (analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 && selectedPlaylistIds.length > 0) {
        // Batch queue downloading
        for (const itemId of selectedPlaylistIds) {
          const item = analyzedMetadata.playlistItems.find((p) => p.id === itemId);
          if (!item) continue;

          const res = await fetch("/api/jobs/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: `${analyzedMetadata.url}&track=${item.id}`,
              title: item.title,
              thumbnail: item.thumbnail || analyzedMetadata.thumbnail,
              platform: analyzedMetadata.platform,
              formatId: selectedFormat.id,
              quality: selectedFormat.resolution,
              sizeLabel: item.sizeLabel || "12.4 MB",
              ext: selectedFormat.ext,
            }),
          });

          const data = await res.json();
          if (res.ok) {
            const newJob: QueueItem = {
              id: data.jobId,
              url: `${analyzedMetadata.url}&track=${item.id}`,
              title: item.title,
              thumbnail: item.thumbnail || analyzedMetadata.thumbnail,
              platform: analyzedMetadata.platform,
              formatId: selectedFormat.id,
              quality: selectedFormat.qualityLabel,
              state: DownloadState.VALIDATING,
              progress: 0,
            };

            addJob(newJob);

            await addHistoryRecord({
              id: data.jobId,
              url: `${analyzedMetadata.url}&track=${item.id}`,
              platform: analyzedMetadata.platform,
              title: item.title,
              thumbnail: item.thumbnail || analyzedMetadata.thumbnail,
              author: item.author || analyzedMetadata.author,
              durationLabel: item.durationLabel,
              format: selectedFormat.ext,
              quality: selectedFormat.resolution,
              fileSizeLabel: item.sizeLabel || "12.4 MB",
              date: Date.now(),
              status: "completed",
            });
          }
        }
        setQueueExpanded(true);
        setAnalyzedMetadata(null);
      } else {
        // Trigger generic single API endpoint job creation
        const res = await fetch("/api/jobs/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: analyzedMetadata.url,
            title: analyzedMetadata.title,
            thumbnail: analyzedMetadata.thumbnail,
            platform: analyzedMetadata.platform,
            formatId: selectedFormat.id,
            quality: selectedFormat.resolution,
            sizeLabel: selectedFormat.sizeLabel || "15.4 MB",
            ext: selectedFormat.ext,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to trigger backend stream download loop.");
        }

        // Add to running active queue in store
        const newJob: QueueItem = {
          id: data.jobId,
          url: analyzedMetadata.url,
          title: analyzedMetadata.title,
          thumbnail: analyzedMetadata.thumbnail,
          platform: analyzedMetadata.platform,
          formatId: selectedFormat.id,
          quality: selectedFormat.qualityLabel,
          state: DownloadState.VALIDATING,
          progress: 0,
        };

        addJob(newJob);
        setQueueExpanded(true); // Pop-up active downloads tracking panel

        // Save to IndexedDB (Part 12)
        await addHistoryRecord({
          id: data.jobId,
          url: analyzedMetadata.url,
          platform: analyzedMetadata.platform,
          title: analyzedMetadata.title,
          thumbnail: analyzedMetadata.thumbnail,
          author: analyzedMetadata.author,
          durationLabel: analyzedMetadata.durationLabel,
          format: selectedFormat.ext,
          quality: selectedFormat.resolution,
          fileSizeLabel: selectedFormat.sizeLabel || "15.4 MB",
          date: Date.now(),
          status: "completed",
        });

        // Clear main search/analyzed state to allow next URL paste immediately
        setAnalyzedMetadata(null);
      }
    } catch (err: any) {
      alert(`API Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 220, damping: 25 }}
      className="w-full bg-zinc-950/60 border border-zinc-900/60 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden"
      id="metadata-preview-panel"
    >
      {/* Decorative colored glow blob */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-brand-accent/10 blur-[80px]" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Side: Thumbnail Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-video rounded-2xl overflow-hidden group shadow-2xl border border-zinc-900 bg-zinc-900">
            <img
              src={analyzedMetadata.thumbnail}
              alt={analyzedMetadata.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            
            {/* Resolution overlay Badge */}
            <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-800 text-xs font-mono font-semibold text-zinc-300">
              {analyzedMetadata.formats[0]?.resolution || "HD"}
            </div>

            {/* Duration Badge */}
            <div className="absolute bottom-3 right-3 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300">
              {analyzedMetadata.durationLabel}
            </div>

            {analyzedMetadata.isLive && (
              <div className="absolute top-3 right-3 bg-red-600/90 text-white text-xs px-2.5 py-1 rounded-full animate-pulse border border-red-500 font-mono tracking-wider">
                LIVE
              </div>
            )}
          </div>

          {/* Publisher Details Row */}
          <div className="flex items-center gap-3 p-3 bg-zinc-900/40 rounded-2xl border border-zinc-900">
            {analyzedMetadata.authorAvatar ? (
              <img
                src={analyzedMetadata.authorAvatar}
                alt={analyzedMetadata.author}
                className="w-10 h-10 rounded-full border border-zinc-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent border border-brand-accent/40">
                {analyzedMetadata.author[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-zinc-100 truncate">
                {analyzedMetadata.author}
              </h4>
              <p className="text-xs font-mono text-zinc-500 capitalize">
                Verified {analyzedMetadata.platform} Creator
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Metadata grid & Formats accordion */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            
            {/* Title */}
            <div>
              <span className="text-xs font-mono tracking-widest text-brand-accent uppercase mb-1 block">
                {analyzedMetadata.platform} Resource
              </span>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
                {analyzedMetadata.title}
              </h3>
            </div>

            {/* Stats list */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-900/60 shadow-lg shadow-black/30">
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <Eye className="w-4 h-4 text-brand-accent" />
                </div>
                <div className="text-xs font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Views</div>
                  <div className="font-extrabold text-zinc-200">
                    {analyzedMetadata.views?.toLocaleString() || "N/A"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <ThumbsUp className="w-4 h-4 text-brand-accent" />
                </div>
                <div className="text-xs font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Likes</div>
                  <div className="font-extrabold text-zinc-200">
                     {analyzedMetadata.likes?.toLocaleString() || "N/A"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <Calendar className="w-4 h-4 text-brand-accent" />
                </div>
                <div className="text-xs font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Released</div>
                  <div className="font-extrabold text-zinc-200 truncate max-w-[85px]">
                    {analyzedMetadata.uploadDate ? new Date(analyzedMetadata.uploadDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: '2-digit'}) : "N/A"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                  <Clock className="w-4 h-4 text-brand-accent" />
                </div>
                <div className="text-xs font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Duration</div>
                  <div className="font-extrabold text-zinc-200">
                    {analyzedMetadata.durationLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Expander Description */}
            {analyzedMetadata.description && (
              <div className="bg-zinc-900/20 rounded-xl p-3 border border-zinc-900/40 text-xs">
                <p className={`text-zinc-400 leading-relaxed ${isDescExpanded ? "" : "line-clamp-2"}`}>
                  {analyzedMetadata.description}
                </p>
                <button
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-1 flex items-center gap-1.5 focus:outline-none font-mono text-[10px] text-brand-accent hover:text-purple-300 transition-colors uppercase font-bold"
                >
                  {isDescExpanded ? (
                    <>
                      Collapse Detail <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Expand Summary <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Chapters Selection (if present) */}
            {analyzedMetadata.chapters && analyzedMetadata.chapters.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
                  Interactive Chapter Selection (Optional)
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                  {analyzedMetadata.chapters.map((chap, idx) => {
                    const isSelected = selectedChapters.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleChapter(idx)}
                        className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                          isSelected
                            ? "bg-brand-accent/15 text-brand-accent border-brand-accent/55"
                            : "bg-zinc-900/40 text-zinc-400 border-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        {chap.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Playlist batch picker section */}
            {analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 && (
              <div className="flex flex-col gap-3.5 bg-zinc-950/40 border border-zinc-900/80 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-zinc-200 font-bold text-xs font-mono uppercase tracking-wide flex items-center gap-1.5">
                      Batch Playlist Intelligence
                    </h5>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {selectedPlaylistIds.length} of {analyzedMetadata.playlistItems.length} tracks chosen
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSelectedPlaylistIds(analyzedMetadata.playlistItems!.map((item) => item.id))}
                      className="text-brand-accent hover:text-purple-300 transition-colors uppercase font-bold focus:outline-none cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-zinc-800">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPlaylistIds([])}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors uppercase font-bold focus:outline-none cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {analyzedMetadata.playlistItems.map((item, idx) => {
                    const isChecked = selectedPlaylistIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedPlaylistIds((prev) =>
                            prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-brand-accent/5 border-brand-accent/30"
                            : "bg-zinc-950/20 border-zinc-900/60 hover:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div onClick
                            className="w-3.5 h-3.5 rounded border-zinc-850 text-brand-accent focus:ring-0 shrink-0 cursor-pointer"
                          />
                          <span className="text-xs font-mono text-zinc-500 w-5 text-right">
                            {(idx + 1).toString().padStart(2, "0")}
                          </span>
                          <span className="text-xs font-medium text-zinc-250 truncate pr-4">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {item.durationLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Video / Audio Formats Selector Ladder */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-mono tracking-wider text-zinc-400 font-semibold">
                Select Output Quality Presets
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {analyzedMetadata.formats.map((form) => {
                  const isActive = selectedFormatId === form.id;
                  return (
                    <button
                      key={form.id}
                      onClick={() => setSelectedFormatId(form.id)}
                      className={`flex flex-col items-start gap-1 p-3.5 rounded-2xl border text-left transition-all duration-200 transform cursor-pointer relative overflow-hidden ${
                        isActive
                          ? "bg-brand-accent/15 border-brand-accent/80 shadow-[0_4px_20px_rgba(124,58,237,0.15)] ring-1 ring-brand-accent/45 scale-[1.01]"
                          : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-850 hover:bg-zinc-900/10 text-zinc-300"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center">
                          <span className="absolute w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                          <span className="relative w-1.5 h-1.5 rounded-full bg-brand-accent" />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 w-full justify-between">
                        <span className="text-xs font-extrabold leading-none text-white font-mono uppercase">
                          {form.resolution}
                        </span>
                        {!isActive && (form.hasVideo ? (
                          <Video className="w-3 h-3 text-zinc-600" />
                        ) : (
                          <Music className="w-3 h-3 text-zinc-600" />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate w-full">
                        {form.qualityLabel}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-550 mt-0.5 font-medium">
                        {form.sizeLabel || "N/A size"} • {form.ext.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setAnalyzedMetadata(null)}
              className="px-5 py-3 rounded-2xl font-mono text-xs font-medium border border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all focus:outline-none"
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadTrigger}
              disabled={isSubmitting || (!!analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 && selectedPlaylistIds.length === 0)}
              className="flex-1 bg-brand-accent hover:bg-opacity-90 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-medium text-sm py-3 px-6 rounded-2xl flex items-center justify-center gap-2 h-full cursor-pointer select-none transition-all duration-200 shadow-lg shadow-brand-accent/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                  Generating secure pipeline...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 ? (
                    `Batch Download Playlist (${selectedPlaylistIds.length} tracks)`
                  ) : (
                    "Download Selected Stream"
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
