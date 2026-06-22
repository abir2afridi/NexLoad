/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { addHistoryRecord } from "../lib/db";
import { DownloadState, QueueItem, MediaFormat } from "../types";
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
import { apiFetch } from "../lib/api";

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
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => { setThumbnailError(false); }, [analyzedMetadata?.url]);

  // ── Show ALL formats; >720p ones get a warning icon in UI when ffmpeg missing ──
  const filteredFormats: MediaFormat[] = React.useMemo(() => {
    if (!analyzedMetadata) return [];
    return analyzedMetadata.formats || [];
  }, [analyzedMetadata]);

  // ── Reset selected format whenever the analyzed media changes (new URL) ──
  useEffect(() => {
    if (!analyzedMetadata || filteredFormats.length === 0) return;
    const defaultId = analyzedMetadata.recommendedFormatId || filteredFormats[0].id;
    // Validate that recommendedFormatId actually exists in filteredFormats
    const exists = filteredFormats.some((f) => f.id === defaultId);
    setSelectedFormatId(exists ? defaultId : filteredFormats[0].id);
  }, [analyzedMetadata?.url]); // re-run whenever URL changes

  useEffect(() => {
    if (!analyzedMetadata) return;
    if (analyzedMetadata.playlistItems) {
      setSelectedPlaylistIds(analyzedMetadata.playlistItems.map((item) => item.id));
    } else {
      setSelectedPlaylistIds([]);
    }
  }, [analyzedMetadata?.url]);

  if (!analyzedMetadata || filteredFormats.length === 0) return null;

  const selectedFormat = filteredFormats.find((f) => f.id === selectedFormatId) ?? filteredFormats[0];


  const toggleChapter = (index: number) => {
    setSelectedChapters((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleDownloadTrigger = async () => {
    if (!selectedFormat) return;
    setIsSubmitting(true);

    const payload = {
      url: analyzedMetadata.url,
      title: analyzedMetadata.title,
      thumbnail: analyzedMetadata.thumbnail,
      platform: analyzedMetadata.platform,
      formatId: selectedFormat.id,
      quality: selectedFormat.resolution,
      sizeLabel: selectedFormat.sizeLabel || "15.4 MB",
      ext: selectedFormat.ext,
      directUrl: analyzedMetadata.directUrl,
    };
    console.log('[NexLoad] Starting download with payload:', JSON.stringify(payload));

    try {
      if (analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 && selectedPlaylistIds.length > 0) {
        for (const itemId of selectedPlaylistIds) {
          const item = analyzedMetadata.playlistItems.find((p) => p.id === itemId);
          if (!item) continue;

          const itemPayload = {
            ...payload,
            url: `${analyzedMetadata.url}&track=${item.id}`,
            title: item.title,
            thumbnail: item.thumbnail || analyzedMetadata.thumbnail,
            sizeLabel: item.sizeLabel || "12.4 MB",
          };
          console.log('[NexLoad] Playlist item payload:', JSON.stringify(itemPayload));

          const res = await apiFetch("/api/jobs/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemPayload),
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
        const res = await apiFetch("/api/jobs/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
      className="w-full card-brutalist bg-cream p-4 sm:p-6 md:p-8 relative overflow-hidden"
      id="metadata-preview-panel"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8 relative z-10">
        {/* Left: Thumbnail */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-video overflow-hidden border border-ink/10 bg-ink/[0.02]">
            {thumbnailError ? (
              <div className="w-full h-full bg-gradient-to-br from-ink/5 to-amber/10 flex items-center justify-center">
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-ink/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-[10px] font-mono text-ink/30">No preview</p>
                </div>
              </div>
            ) : (
              <img
                src={analyzedMetadata.thumbnail}
                alt={analyzedMetadata.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer-when-downgrade"
                onError={() => setThumbnailError(true)}
              />
            )}
            <div className="absolute top-3 left-3 bg-cream-dark px-3 py-1 border border-ink/10 text-[10px] font-mono text-ink-light">
               {selectedFormat?.resolution || filteredFormats[0]?.resolution || "HD"}
            </div>
            <div className="absolute bottom-3 right-3 bg-cream-dark px-2.5 py-1 border border-ink/10 text-[10px] font-mono text-ink-light">
              {analyzedMetadata.durationLabel}
            </div>
            {analyzedMetadata.isLive && (
              <div className="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] px-2.5 py-1 border border-red-500 font-mono tracking-wider animate-pulse">
                LIVE
              </div>
            )}
          </div>

          <div className="card-brutalist-static p-3 flex items-center gap-3">
            {analyzedMetadata.authorAvatar ? (
              <img
                src={analyzedMetadata.authorAvatar}
                alt={analyzedMetadata.author}
                className="w-10 h-10 border border-ink/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-amber/20 flex items-center justify-center font-bold text-amber border border-amber/40">
                {analyzedMetadata.author[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm text-ink/70 truncate">
                {analyzedMetadata.author}
              </h4>
              <p className="text-[10px] font-mono text-ink-muted capitalize">
                Verified {analyzedMetadata.platform} Creator
              </p>
            </div>
          </div>
        </div>

        {/* Right: Metadata */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[9px] tracking-[0.25em] text-amber uppercase mb-1 block">
                {analyzedMetadata.platform} Resource
              </span>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-ink leading-tight">
                {analyzedMetadata.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-ink/10">
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
                <div key={label} className="bg-cream p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-ink-light">
                  <Icon className="w-4 h-4 text-amber shrink-0" />
                  <div className="text-[11px] font-mono">
                    <div className="text-[8px] text-ink-muted uppercase tracking-wider">
                      {label}
                    </div>
                    <div className="font-bold text-ink/80">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {analyzedMetadata.description && (
              <div className="card-brutalist-static p-3 text-xs">
                <p className={`text-ink-light font-sans leading-relaxed ${isDescExpanded ? "" : "line-clamp-2"}`}>
                  {analyzedMetadata.description}
                </p>
                <button
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-1 flex items-center gap-1.5 focus:outline-none font-mono text-[9px] text-amber hover:text-ink transition-colors uppercase tracking-wider "
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
                <span className="label-meta">Interactive Chapters (Optional)</span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                  {analyzedMetadata.chapters.map((chap, idx) => {
                    const isSelected = selectedChapters.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleChapter(idx)}
                        className={`text-[10px] px-2.5 py-1 border transition-all cursor-pointer uppercase tracking-wider font-mono  ${
                          isSelected
                            ? "bg-amber/10 text-amber border-amber/50"
                            : "bg-ink/[0.02] text-ink-muted border-ink/10 hover:border-ink/20"
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
              <div className="card-brutalist-static p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-ink/70 text-xs">
                      Batch Playlist Intelligence
                    </h5>
                    <span className="text-[9px] font-mono text-ink-muted">
                      {selectedPlaylistIds.length} of {analyzedMetadata.playlistItems.length} tracks chosen
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-[9px] font-mono uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setSelectedPlaylistIds(analyzedMetadata.playlistItems!.map((item) => item.id))}
                      className="text-amber hover:text-ink transition-colors cursor-pointer "
                    >
                      All
                    </button>
                    <span className="text-ink/20">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPlaylistIds([])}
                      className="text-ink-muted hover:text-ink-light transition-colors cursor-pointer "
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
                            ? "bg-amber/5 border-amber/30"
                            : "bg-ink/[0.01] border-ink/10 hover:border-ink/20"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3 h-3 accent-amber cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-ink-muted w-5 text-right">
                            {(idx + 1).toString().padStart(2, "0")}
                          </span>
                          <span className="text-xs font-sans text-ink-light truncate pr-4">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-ink-muted shrink-0">
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

              {/* ffmpeg warning banner */}
              {!analyzedMetadata.ffmpegAvailable && selectedFormat?.hasVideo && (
                <div className="flex items-start gap-3 p-3 border border-amber/40 bg-amber/5 text-xs">
                  <span className="text-amber font-bold shrink-0 mt-0.5">⚠</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-ink/80 font-mono">
                      <strong>ffmpeg not installed</strong> — max video quality is ~480p
                    </span>
                    <span className="text-ink-muted">
                      YouTube 720p+ uses separate video+audio streams that require ffmpeg to merge.
                    </span>
                    <a
                      href="https://ffmpeg.org/download.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber underline text-[10px] tracking-wide mt-0.5 hover:text-ink transition-colors"
                    >
                      → Download ffmpeg from ffmpeg.org
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-ink/10">
                {filteredFormats.map((form) => {
                  const isActive = selectedFormatId === form.id;
                  // Determine if this format needs ffmpeg (>720p video)
                  const needsFfmpeg = (() => {
                    if (!form.hasVideo || analyzedMetadata.ffmpegAvailable) return false;
                    const m = form.resolution.match(/(\d+)p/);
                    const h = m ? parseInt(m[1]) : 0;
                    return h >= 720;
                  })();
                  return (
                    <button
                      key={form.id}
                      onClick={() => {
                        setSelectedFormatId(form.id);
                      }}
                      className={`flex flex-col items-start gap-1 p-3.5 text-left transition-all cursor-pointer relative ${
                        isActive
                          ? needsFfmpeg
                            ? "bg-amber/5 text-ink ring-1 ring-amber/40"
                            : "bg-amber/10 text-ink ring-1 ring-amber"
                          : needsFfmpeg
                            ? "bg-ink/[0.01] text-ink-muted/60 hover:bg-ink/[0.02] opacity-60"
                            : "bg-cream text-ink-light hover:bg-ink/[0.02]"
                      }`}
                    >
                      {isActive && !needsFfmpeg && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber animate-pulse" />
                      )}
                      {needsFfmpeg && (
                        <div className="absolute top-2 right-2 text-[9px] text-amber" title="Requires ffmpeg">⚠</div>
                      )}
                      <div className="flex items-center gap-1.5 w-full justify-between">
                        <span className="text-xs text-ink/70">
                          {form.resolution}
                        </span>
                        {!isActive && (form.hasVideo ? (
                          <Video className="w-3 h-3 text-ink/20" />
                        ) : (
                          <Music className="w-3 h-3 text-ink/20" />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono text-ink-muted mt-0.5 truncate w-full">
                        {needsFfmpeg ? `${form.qualityLabel} → 480p` : form.qualityLabel}
                      </span>
                      <span className="text-[9px] font-mono text-ink-muted mt-0.5">
                        {form.sizeLabel || "N/A"} &bull; {form.ext.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
            <button
              onClick={() => setAnalyzedMetadata(null)}
              className="px-5 py-3 font-mono text-xs border border-ink/10 text-ink-muted hover:text-ink-light hover:bg-ink/[0.02] transition-all "
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadTrigger}
              disabled={
                isSubmitting ||
                (!!analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0 && selectedPlaylistIds.length === 0) ||
                // Disable if format needs ffmpeg but it's not installed
                (() => {
                  if (!selectedFormat?.hasVideo) return false;
                  const m = selectedFormat.resolution.match(/(\d+)p/);
                  const h = m ? parseInt(m[1]) : 0;
                  return h > 720 && !analyzedMetadata.ffmpegAvailable;
                })()
              }
              className="flex-1 bg-amber hover:bg-ink text-white text-sm tracking-[0.1em] uppercase py-3 px-6 flex items-center justify-center gap-2 transition-all disabled:bg-ink/10 disabled:text-ink-muted disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
                  Generating pipeline...
                </>
              ) : (
                <>
                  {selectedFormat?.hasVideo ? (
                    <Download className="w-4 h-4" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                  {analyzedMetadata.playlistItems && analyzedMetadata.playlistItems.length > 0
                    ? `Batch Download (${selectedPlaylistIds.length} tracks)`
                    : selectedFormat?.hasVideo
                      ? "Download Stream"
                      : "Download Audio"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
