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
      <div className="max-w-4xl mx-auto bg-black border border-white/10">
        {/* Toggle bar */}
        <div
          onClick={() => setQueueExpanded(!isQueueExpanded)}
          className="flex justify-between items-center px-5 py-3.5 border-b border-white/5 cursor-pointer hover:bg-white/[0.015] transition-all select-none"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              {activeCount > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5b00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff5b00]" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white/20" />
              )}
            </div>
            <span className="text-sm font-display tracking-wider text-white/70 uppercase">
              {activeCount > 0
                ? `Downloading ${activeCount} file${activeCount > 1 ? "s" : ""}`
                : "All tasks completed"}
            </span>
            <span className="text-[9px] font-mono text-white/30 bg-white/5 px-2 py-0.5 border border-white/10">
              {activeJobs.length} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isQueueExpanded ? (
              <ChevronDown className="w-4 h-4 text-white/30" />
            ) : (
              <ChevronUp className="w-4 h-4 text-white/30" />
            )}
          </div>
        </div>

        {/* Expanded contents */}
        {isQueueExpanded && (
          <div className="p-4 md:p-5 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="border border-white/5 p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                  <img
                    src={
                      job.thumbnail ||
                      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&fit=crop"
                    }
                    alt={job.title}
                    className="w-14 h-9 object-cover bg-white/5 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] uppercase font-display tracking-[0.2em] px-1.5 py-0.5 text-[#ff5b00] bg-[#ff5b00]/10 border border-[#ff5b00]/20">
                        {job.platform}
                      </span>
                      <span className="text-[9px] font-mono text-white/30">
                        {job.formatId}
                      </span>
                    </div>
                    <h4 className="text-xs font-display tracking-wider text-white/70 truncate max-w-lg uppercase">
                      {job.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1 bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${job.progress}%` }}
                          transition={{ type: "spring", stiffness: 80, damping: 15 }}
                          className="bg-[#ff5b00] h-full"
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white/50 w-8 text-right">
                        {Math.round(job.progress)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto font-mono text-[10px] text-white/40">
                  <div className="flex items-center gap-3">
                    {job.state === DownloadState.DOWNLOADING && (
                      <>
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-white/30" />
                          {job.speedMbps ? `${job.speedMbps} Mbps` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-white/30" />
                          {job.etaSeconds ? `${job.etaSeconds}s` : ""}
                        </span>
                      </>
                    )}
                    {job.state !== DownloadState.COMPLETED &&
                      job.state !== DownloadState.FAILED && (
                        <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white/40 text-[8px] uppercase tracking-wider">
                          {job.state.toLowerCase().replace("_", " ")}
                        </span>
                      )}
                  </div>

                  <div className="flex items-center gap-1">
                    {job.state === DownloadState.COMPLETED && job.downloadUrl ? (
                      <a
                        href={job.downloadUrl}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff5b00] hover:bg-[#e65200] text-white text-[9px] font-display tracking-wider uppercase transition-all cursor-pointer"
                      >
                        <Save className="w-3 h-3" /> Save
                      </a>
                    ) : job.state === DownloadState.FAILED ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" /> Failed
                      </div>
                    ) : (
                      <button
                        onClick={() => removeJob(job.id)}
                        className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
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
