/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { DownloadState, QueueItem } from "../types";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  Gauge,
  Clock,
  Save,
} from "lucide-react";

export const QueueDrawer: React.FC = () => {
  const {
    activeJobs,
    updateJob,
    removeJob,
    isQueueExpanded,
    setQueueExpanded,
  } = useAppStore();

  useEffect(() => {
    const activeRunningJobs = activeJobs.filter(
      (job) => job.state !== DownloadState.COMPLETED && job.state !== DownloadState.FAILED
    );
    if (activeRunningJobs.length === 0) return;

    const pollInterval = setInterval(async () => {
      for (const runningJob of activeRunningJobs) {
        try {
          const res = await fetch(`/api/jobs/${runningJob.id}`);
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

  if (activeJobs.length === 0) return null;

  const activeCount = activeJobs.filter(
    (j) => j.state !== DownloadState.COMPLETED && j.state !== DownloadState.FAILED
  ).length;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 md:px-8 md:pb-6"
      id="download-queue-drawer-root"
    >
      <div className="max-w-4xl mx-auto card-brutalist bg-cream">
        {/* Toggle bar */}
        <div
          onClick={() => setQueueExpanded(!isQueueExpanded)}
          className="flex justify-between items-center px-5 py-3.5 border-b border-sand cursor-pointer hover:bg-ink/[0.02] transition-all select-none"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 ${
                activeCount > 0 ? "bg-amber animate-pulse" : "bg-ink/20"
              }`}
            />
            <span className="text-sm text-ink/80">
              {activeCount > 0
                ? `Downloading ${activeCount} file${activeCount > 1 ? "s" : ""}`
                : "All tasks completed"}
            </span>
            <span className="text-[9px] text-ink-muted bg-ink/5 px-2 py-0.5 border border-sand">
              {activeJobs.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isQueueExpanded ? (
              <ChevronDown className="w-4 h-4 text-ink-muted" />
            ) : (
              <ChevronUp className="w-4 h-4 text-ink-muted" />
            )}
          </div>
        </div>

        {/* Expanded contents */}
        {isQueueExpanded && (
          <div className="p-4 md:p-5 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="card-brutalist-static p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                  <img
                    src={
                      job.thumbnail ||
                      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&fit=crop"
                    }
                    alt={job.title}
                    className="w-14 h-9 object-cover bg-ink/5 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] tracking-[0.2em] uppercase px-1.5 py-0.5 text-amber bg-amber/10 border border-amber/20">
                        {job.platform}
                      </span>
                      {job.quality && (
                        <span className="text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 text-ink-muted bg-ink/5 border border-sand">
                          {job.quality}
                        </span>
                      )}
                      {job.fileSizeLabel && job.state === DownloadState.COMPLETED && (
                        <span className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5">
                          ✓ {job.fileSizeLabel}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs text-ink/70 truncate max-w-lg">
                      {job.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 bg-ink/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${job.progress}%` }}
                          transition={{ type: "spring", stiffness: 80, damping: 15 }}
                          className="bg-amber h-full"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-ink-light w-8 text-right">
                        {Math.round(job.progress)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto text-[10px] text-ink-muted">
                  <div className="flex items-center gap-3">
                    {job.state === DownloadState.DOWNLOADING && (
                      <>
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-ink-muted" />
                          {job.speedMbps ? `${job.speedMbps} Mbps` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-ink-muted" />
                          {job.etaSeconds ? `${job.etaSeconds}s` : ""}
                        </span>
                      </>
                    )}
                    {job.state !== DownloadState.COMPLETED &&
                      job.state !== DownloadState.FAILED && (
                        <span className="px-2 py-0.5 bg-ink/5 border border-sand text-ink-muted text-[8px] uppercase tracking-wider">
                          {job.state.toLowerCase().replace("_", " ")}
                        </span>
                      )}
                  </div>

                  <div className="flex items-center gap-1">
                    {job.state === DownloadState.COMPLETED && job.downloadUrl ? (
                      <a
                        href={job.downloadUrl}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber hover:bg-ink text-white text-[9px] tracking-wider uppercase transition-all cursor-pointer"
                      >
                        <Save className="w-3 h-3" /> Save
                      </a>
                    ) : job.state === DownloadState.FAILED ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red/10 border border-red/20 text-red text-[9px] uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" /> Failed
                      </div>
                    ) : (
                      <button
                        onClick={() => removeJob(job.id)}
                        className="p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
