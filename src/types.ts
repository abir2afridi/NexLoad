/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Core types for NexLoad platform-aware intelligence

export enum DownloadState {
  IDLE = "IDLE",
  VALIDATING = "VALIDATING",
  FETCHING_METADATA = "FETCHING_METADATA",
  ANALYZING = "ANALYZING",
  READY = "READY",
  PROCESSING = "PROCESSING",
  DOWNLOADING = "DOWNLOADING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  RETRYING = "RETRYING"
}

export interface MediaChapter {
  title: string;
  start: number; // in seconds
  end: number;
}

export interface MediaFormat {
  id: string;
  ext: string;
  resolution: string; // e.g. "1080p", "720p", "Audio Only"
  qualityLabel: string; // e.g. "1080p (60fps) MP4"
  fps?: number;
  sizeBytes?: number;
  sizeLabel?: string;
  hasVideo: boolean;
  hasAudio: boolean;
  bitrate?: number;
  container: string;
}

export interface MediaMetadata {
  id: string;
  url: string;
  platform: "youtube" | "tiktok" | "instagram" | "reddit" | "soundcloud" | "vimeo" | "twitch" | "facebook" | "twitter" | "pinterest" | "generic";
  title: string;
  thumbnail: string;
  author: string;
  authorAvatar?: string;
  authorUrl?: string;
  durationSeconds: number;
  durationLabel: string;
  uploadDate: string; // Absolute ISO string or human relative
  views?: number;
  likes?: number;
  description?: string;
  tags?: string[];
  isLive: boolean;
  viewerCount?: number;
  chapters?: MediaChapter[];
  formats: MediaFormat[];
  recommendedFormatId?: string;
  playlistItems?: PlaylistItem[];
  // Indicates if ffmpeg is available on the server (required for merging high‑resolution streams)
  ffmpegAvailable?: boolean;
}


export interface PlaylistItem {
  id: string;
  title: string;
  durationLabel: string;
  thumbnail?: string;
  author?: string;
  sizeLabel?: string;
}

export interface SearchResultItem {
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

export interface BrowseChannelDetails {
  id: string;
  name: string;
  avatar: string;
  banner?: string;
  subscriberCount?: string;
  videoCount?: string;
  videos: SearchResultItem[];
}

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: string;
  formatId: string;
  quality: string;
  state: DownloadState;
  progress: number; // 0 - 100
  speedMbps?: number;
  etaSeconds?: number;
  fileSizeLabel?: string;
  error?: string;
  downloadUrl?: string;
}

export interface UserSettings {
  defaultQuality: "best" | "2160p" | "1080p" | "720p" | "480p" | "360p" | "audio";
  preferHdr: boolean;
  preferAv1: boolean;
  includeSubtitles: boolean;
  subtitleLanguage: string;
  defaultAudioFormat: "mp3" | "wav" | "aac" | "flac" | "opus";
  mp3Bitrate: "128" | "192" | "320";
  normalizeAudio: boolean;
  embedMetadata: boolean;
  embedCoverArt: boolean;
  autoDownload: boolean;
  concurrentDownloads: number;
  filenameTemplate: string;
  accentColor: string; // Hex string e.g. "#7C3AED"
  youtubeApiKey?: string;
  searchRegion: string;
  safeSearch: boolean;
  showTrendingOnOpen: boolean;
  customEndpoint?: string;
  enableDebug: boolean;
}
