/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserSettings, MediaMetadata, QueueItem } from "../types";

interface AppState {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
  
  // UI Panels
  isSettingsOpen: boolean;
  isAboutOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  
  // App Mode
  appMode: "video" | "image";
  setAppMode: (mode: "video" | "image") => void;
  
  // URL Input
  urlInput: string;
  setUrlInput: (url: string) => void;
  
  // Active Download Queue Drawer state
  isQueueExpanded: boolean;
  setQueueExpanded: (expanded: boolean) => void;
  activeJobs: QueueItem[];
  addJob: (job: QueueItem) => void;
  updateJob: (jobId: string, updates: Partial<QueueItem>) => void;
  removeJob: (jobId: string) => void;
  
  // Selected Metadata/Preview
  analyzedMetadata: MediaMetadata | null;
  setAnalyzedMetadata: (meta: MediaMetadata | null) => void;
  isAnalyzing: boolean;
  setAnalyzing: (analyzing: boolean) => void;
  analysisError: string | null;
  setAnalysisError: (error: string | null) => void;

  // Active Browsing Theme Mode
  themeMode: "dark" | "dark2" | "light" | "system";
  setThemeMode: (mode: "dark" | "dark2" | "light" | "system") => void;
}

const defaultSettings: UserSettings = {
  defaultQuality: "best",
  preferHdr: true,
  preferAv1: false,
  includeSubtitles: false,
  subtitleLanguage: "en",
  defaultAudioFormat: "mp3",
  mp3Bitrate: "320",
  normalizeAudio: true,
  embedMetadata: true,
  embedCoverArt: true,
  autoDownload: false,
  concurrentDownloads: 3,
  filenameTemplate: "{title} [{quality}]",
  accentColor: "#7C3AED", // Royal purple
  searchRegion: "US",
  safeSearch: true,
  showTrendingOnOpen: true,
  enableDebug: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
      resetSettings: () => set({ settings: defaultSettings }),

      isSettingsOpen: false,
      isAboutOpen: false,
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setAboutOpen: (open) => set({ isAboutOpen: open }),

      appMode: "video",
      setAppMode: (mode) => set({ appMode: mode }),

      urlInput: "",
      setUrlInput: (url) => set({ urlInput: url }),

      isQueueExpanded: false,
      setQueueExpanded: (expanded) => set({ isQueueExpanded: expanded }),
      activeJobs: [],
      addJob: (job) => set((state) => ({ activeJobs: [job, ...state.activeJobs] })),
      updateJob: (jobId, updates) =>
        set((state) => ({
          activeJobs: state.activeJobs.map((j) =>
            j.id === jobId ? { ...j, ...updates } : j
          ),
        })),
      removeJob: (jobId) =>
        set((state) => ({
          activeJobs: state.activeJobs.filter((j) => j.id !== jobId),
        })),

      analyzedMetadata: null,
      setAnalyzedMetadata: (meta) => set({ analyzedMetadata: meta }),
      isAnalyzing: false,
      setAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      analysisError: null,
      setAnalysisError: (error) => set({ analysisError: error }),

      themeMode: "dark",
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: "nexload-store",
      partialize: (state) => ({
        settings: state.settings,
        themeMode: state.themeMode,
      }),
    }
  )
);
