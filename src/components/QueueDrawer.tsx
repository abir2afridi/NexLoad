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
  Download,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle,
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

  // Background polling logic for unfinished jobs
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
            error: data.error,
          });
        } catch {
          // Guard connection issues
        }
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
      <div className="max-w-4xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl shadow-[0_-12px_40px_-5px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Toggle bar header */}
        <div
          onClick={() => setQueueExpanded(!isQueueExpanded)}
          className="flex justify-between items-center px-6 py-4 border-b border-zinc-900 cursor-pointer hover:bg-zinc-900/30 transition-all select-none"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-3.5 w-3.5">
              {activeCount > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-accent"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-zinc-600"></span>
              )}
            </div>
            <span className="text-sm font-semibold text-zinc-100 font-sans tracking-wide">
              {activeCount > 0 ? `Downloading ${activeCount} file${activeCount > 1 ? "s" : ""}` : "All tasks completed"}
            </span>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-900">
              {activeJobs.length} total
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isQueueExpanded ? (
              <ChevronDown className="w-5 h-5 text-zinc-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-zinc-400" />
            )}
          </div>
        </div>

        {/* Drawer expanded contents */}
        {isQueueExpanded && (
          <div className="p-4 md:p-6 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-3">
            {activeJobs.map((job) => {
              const remainsLabel = job.etaSeconds ? `${job.etaSeconds}s remaining` : "";
              const speedLabel = job.speedMbps ? `${job.speedMbps} Mbps` : "";

              return (
                <div
                  key={job.id}
                  id={`queue-card-${job.id}`}
                  className="bg-zinc-900/35 border border-zinc-900/50 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <img
                      src={job.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&fit=crop"}
                      alt={job.title}
                      className="w-16 h-10 object-cover rounded-lg bg-zinc-900 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 text-brand-accent bg-brand-accent/10 border border-brand-accent/20 rounded font-semibold">
                          {job.platform}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 font-medium">
                          Format: {job.formatId}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold truncate text-zinc-100 max-w-lg">
                        {job.title}
                      </h4>
                      
                      {/* Interactive Progress Indicators */}
                      <div className="flex items-center gap-3.5 mt-2.5">
                        <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${job.progress}%` }}
                            transition={{ type: "spring", stiffness: 80, damping: 15 }}
                            className="bg-brand-accent h-full rounded-full shadow-[0_0_8px_rgba(124,58,237,0.4)]"
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-300 w-10 text-right">
                          {Math.round(job.progress)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 font-mono text-[11px] text-zinc-400">
                    <div className="flex items-center gap-4">
                      {job.state === DownloadState.DOWNLOADING && (
                        <>
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <Gauge className="w-3.5 h-3.5 text-zinc-500" /> {speedLabel}
                          </span>
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" /> {remainsLabel}
                          </span>
                        </>
                      )}
                      
                      {job.state !== DownloadState.COMPLETED && job.state !== DownloadState.FAILED && (
                        <span className="capitalize px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px]">
                          {job.state.toLowerCase().replace("_", " ")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {job.state === DownloadState.COMPLETED && job.downloadUrl ? (
                        <a
                          href={job.downloadUrl}
                          download
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/15"
                        >
                          <Save className="w-3.5 h-3.5" /> Save File
                        </a>
                      ) : job.state === DownloadState.FAILED ? (
                        <div className="flex items-center gap-1.5 text-red-400 px-3 py-1.5 bg-red-950/20 rounded-xl border border-red-900/30">
                          <AlertTriangle className="w-3.5 h-3.5" /> FAILED
                        </div>
                      ) : (
                        <button
                          onClick={() => removeJob(job.id)}
                          className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-all focus:outline-none cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
