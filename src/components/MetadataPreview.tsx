/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { addHistoryRecord } from "../lib/db";
import { DownloadState, QueueItem } from "../types";
import { motion } from "motion/react";
import {
  Calendar,
  Clock,
  Eye,
  ThumbsUp,
  Download,
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

  if (!selectedFormatId && analyzedMetadata.formats.length > 0) {
    setSelectedFormatId(analyzedMetadata.recommendedFormatId || analyzedMetadata.formats[0].id);
  }

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
        setQueueExpanded(true);

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
      className="w-full border border-white/5 p-6 md:p-8 relative overflow-hidden"
      id="metadata-preview-panel"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left: Thumbnail */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-video overflow-hidden border border-white/5 bg-white/[0.02]">
            <img
              src={analyzedMetadata.thumbnail}
              alt={analyzedMetadata.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 bg-black/80 px-3 py-1 border border-white/10 text-[10px] font-mono text-white/60">
              {analyzedMetadata.formats[0]?.resolution || "HD"}
            </div>
            <div className="absolute bottom-3 right-3 bg-black/80 px-2.5 py-1 border border-white/10 text-[10px] font-mono text-white/60">
              {analyzedMetadata.durationLabel}
            </div>
            {analyzedMetadata.isLive && (
              <div className="absolute top-3 right-3 bg-red-600/90 text-white text-[10px] px-2.5 py-1 border border-red-500 font-mono tracking-wider animate-pulse">
                LIVE
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 border border-white/5">
            {analyzedMetadata.authorAvatar ? (
              <img
                src={analyzedMetadata.authorAvatar}
                alt={analyzedMetadata.author}
                className="w-10 h-10 border border-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-[#ff5b00]/20 flex items-center justify-center font-bold text-[#ff5b00] border border-[#ff5b00]/40">
                {analyzedMetadata.author[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-display tracking-wider text-white/70 uppercase truncate">
                {analyzedMetadata.author}
              </h4>
              <p className="text-[10px] font-mono text-white/30 capitalize">
                Verified {analyzedMetadata.platform} Creator
              </p>
            </div>
          </div>
        </div>

        {/* Right: Metadata */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[9px] font-mono tracking-[0.25em] text-[#ff5b00] uppercase mb-1 block">
                {analyzedMetadata.platform} Resource
              </span>
              <h3 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white/80 uppercase leading-tight">
                {analyzedMetadata.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
              {[
                { icon: Eye, label: "Views", value: analyzedMetadata.views?.toLocaleString() || "N/A" },
                { icon: ThumbsUp, label: "Likes", value: analyzedMetadata.likes?.toLocaleString() || "N/A" },
                {
                  icon: Calendar,
                  label: "Released",
                  value: analyzedMetadata.uploadDate
                    ? new Date(analyzedMetadata.uploadDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "2-digit",
                      })
                    : "N/A",
                },
                { icon: Clock, label: "Duration", value: analyzedMetadata.durationLabel },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-black p-4 flex items-center gap-3 text-white/60">
                  <Icon className="w-4 h-4 text-[#ff5b00] shrink-0" />
                  <div className="text-[11px] font-mono">
                    <div className="text-[8px] text-white/30 uppercase tracking-wider font-display">
                      {label}
                    </div>
                    <div className="font-bold text-white/70">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {analyzedMetadata.description && (
              <div className="border border-white/5 p-3 text-xs">
                <p className={`text-white/40 font-body leading-relaxed ${isDescExpanded ? "" : "line-clamp-2"}`}>
                  {analyzedMetadata.description}
                </p>
                <button
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-1 flex items-center gap-1.5 focus:outline-none font-mono text-[9px] text-[#ff5b00] hover:text-[#ff8c00] transition-colors uppercase tracking-wider"
                >
                  {isDescExpanded ? (
                    <>
                      Collapse <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Expand <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            )}

            {analyzedMetadata.chapters && analyzedMetadata.chapters.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[9px] uppercase font-mono tracking-[0.2em] text-white/30 block">
                  Interactive Chapters (Optional)
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                  {analyzedMetadata.chapters.map((chap, idx) => {
                    const isSelected = selectedChapters.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleChapter(idx)}
                        className={`text-[10px] px-2.5 py-1 border transition-all cursor-pointer uppercase tracking-wider font-display ${
                          isSelected
                            ? "bg-[#ff5b00]/10 text-[#ff5b00] border-[#ff5b00]/50"
                            : "bg-white/[0.02] text-white/30 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {chap.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 && (
              <div className="border border-white/5 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-white/70 font-display text-xs tracking-wider uppercase">
                      Batch Playlist Intelligence
                    </h5>
                    <span className="text-[9px] font-mono text-white/30">
                      {selectedPlaylistIds.length} of {analyzedMetadata.playlistItems.length} tracks chosen
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-[9px] font-mono uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setSelectedPlaylistIds(analyzedMetadata.playlistItems!.map((item) => item.id))}
                      className="text-[#ff5b00] hover:text-[#ff8c00] transition-colors cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-white/10">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPlaylistIds([])}
                      className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
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
                        className={`flex items-center justify-between p-2.5 border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-[#ff5b00]/5 border-[#ff5b00]/30"
                            : "bg-white/[0.01] border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3 h-3 accent-[#ff5b00] cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-white/30 w-5 text-right">
                            {(idx + 1).toString().padStart(2, "0")}
                          </span>
                          <span className="text-xs font-body text-white/60 truncate pr-4">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-white/30 shrink-0">
                          {item.durationLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <span className="label-meta">Select Output Quality</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/5">
                {analyzedMetadata.formats.map((form) => {
                  const isActive = selectedFormatId === form.id;
                  return (
                    <button
                      key={form.id}
                      onClick={() => setSelectedFormatId(form.id)}
                      className={`flex flex-col items-start gap-1 p-3.5 border-0 text-left transition-all cursor-pointer relative ${
                        isActive
                          ? "bg-[#ff5b00]/10 text-white ring-1 ring-[#ff5b00]"
                          : "bg-black text-white/40 hover:bg-white/[0.02]"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ff5b00] animate-pulse" />
                      )}
                      <div className="flex items-center gap-1.5 w-full justify-between">
                        <span className="text-xs font-display tracking-wider uppercase text-white/70">
                          {form.resolution}
                        </span>
                        {!isActive && (form.hasVideo ? (
                          <Video className="w-3 h-3 text-white/20" />
                        ) : (
                          <Music className="w-3 h-3 text-white/20" />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono text-white/30 mt-0.5 truncate w-full">
                        {form.qualityLabel}
                      </span>
                      <span className="text-[9px] font-mono text-white/20 mt-0.5">
                        {form.sizeLabel || "N/A"} &bull; {form.ext.toUpperCase()}
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
              className="px-5 py-3 font-mono text-xs border border-white/10 text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadTrigger}
              disabled={isSubmitting || (!!analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 && selectedPlaylistIds.length === 0)}
              className="flex-1 bg-[#ff5b00] hover:bg-[#e65200] disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed text-white text-sm font-display tracking-[0.1em] uppercase py-3 px-6 flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" />
                  Generating pipeline...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0
                    ? `Batch Download (${selectedPlaylistIds.length} tracks)`
                    : "Download Stream"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
