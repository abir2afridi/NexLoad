/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { DownloadState, MediaMetadata, SearchResultItem, MediaFormat } from "./src/types";

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "5mb" }));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com"],
        connectSrc: ["'self'", "https:", "http:", "wss:", "ws:", "data:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const metadataLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many URL analyses. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many searches. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "Too many download requests. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

function isSsrfBlocklisted(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" || hostname === "127.0.0.1" ||
      hostname === "[::1]" || hostname === "metadata.google.internal" ||
      hostname === "metadata" || hostname === "169.254.169.254"
    ) return true;
    const privateIpRegex = /^(0\.|10\.|100\.64\.|127\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.0\.0\.|192\.168\.|198\.18\.|198\.51\.100\.|203\.0\.113\.|240\.)/;
    if (privateIpRegex.test(hostname)) return true;
    return false;
  } catch {
    return true;
  }
}

type PlatformId = "youtube" | "tiktok" | "instagram" | "reddit" | "soundcloud" | "vimeo" | "twitch" | "facebook" | "twitter" | "pinterest" | "generic";

function extractPlatform(urlStr: string): PlatformId {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("reddit.com")) return "reddit";
    if (host.includes("soundcloud.com")) return "soundcloud";
    if (host.includes("vimeo.com")) return "vimeo";
    if (host.includes("twitch.tv")) return "twitch";
    if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
    if (host.includes("twitter.com") || host.includes("x.com")) return "twitter";
    if (host.includes("pinterest.com") || host.includes("pin.it")) return "pinterest";
    return "generic";
  } catch {
    return "generic";
  }
}

function generateFormats(platform: PlatformId): MediaFormat[] {
  const formats: MediaFormat[] = [
    {
      id: "best_mp4_2160p", ext: "mp4", resolution: "2160p",
      qualityLabel: "4K (60fps) HDR MP4", fps: 60,
      sizeBytes: 157286400, sizeLabel: "150.0 MB",
      hasVideo: true, hasAudio: true, container: "mp4",
    },
    {
      id: "best_mp4_1080p", ext: "mp4", resolution: "1080p",
      qualityLabel: "1080p (60fps) MP4", fps: 60,
      sizeBytes: 78643200, sizeLabel: "75.0 MB",
      hasVideo: true, hasAudio: true, container: "mp4",
    },
    {
      id: "medium_mp4_720p", ext: "mp4", resolution: "720p",
      qualityLabel: "720p (30fps) MP4", fps: 30,
      sizeBytes: 41943040, sizeLabel: "40.0 MB",
      hasVideo: true, hasAudio: true, container: "mp4",
    },
    {
      id: "low_mp4_480p", ext: "mp4", resolution: "480p",
      qualityLabel: "480p (30fps) MP4", fps: 30,
      sizeBytes: 20971520, sizeLabel: "20.0 MB",
      hasVideo: true, hasAudio: true, container: "mp4",
    },
    {
      id: "audio_mp3_320", ext: "mp3", resolution: "Audio Only",
      qualityLabel: "Audio Only - High (320kbps MP3)",
      sizeBytes: 12582912, sizeLabel: "12.0 MB",
      hasVideo: false, hasAudio: true, bitrate: 320, container: "mp3",
    },
    {
      id: "audio_flac", ext: "flac", resolution: "Audio Only",
      qualityLabel: "Audio Only - Lossless FLAC",
      sizeBytes: 31457280, sizeLabel: "30.0 MB",
      hasVideo: false, hasAudio: true, bitrate: 1411, container: "flac",
    },
  ];
  return formats;
}

function extractMediaId(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("?")[0] || "unknown";
    if (url.hostname.includes("youtube.com")) {
      const listId = url.searchParams.get("list");
      const v = url.searchParams.get("v");
      if (listId && !v) return listId;
      if (v) return v;
      const paths = url.pathname.split("/");
      for (let i = 0; i < paths.length; i++) {
        if (paths[i] === "shorts" && paths[i + 1]) return paths[i + 1];
        if (paths[i] === "watch" && paths[i + 1]) return paths[i + 1];
      }
    }
    return url.pathname.split("/").filter(Boolean).pop() || "unknown";
  } catch {
    return Math.random().toString(36).substring(2, 11);
  }
}

function generateMockMetadata(url: string, platform: PlatformId): MediaMetadata {
  const id = extractMediaId(url);
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 120);
  const uploadDate = new Date(now.getTime() - daysAgo * 86400000).toISOString();
  const duration = Math.floor(Math.random() * 900) + 60;

  const isPlaylist = /[?&]list=|playlist|album|set|compilation|\/playlist\/|series|\/albums\/|\/sets\//i.test(url);

  const titles: Record<PlatformId, string[]> = {
    youtube: [
      "How to Build a Full-Stack App in 2026",
      "Deep Dive into React Server Components",
      "The Future of AI-Assisted Development",
      "Building Scalable APIs with Node.js",
      "Complete Guide to TypeScript 5.8",
    ],
    tiktok: [
      "This simple coding trick blew my mind!",
      "Learn Python in 60 seconds",
      "Dev life hack you need to know",
      "Why your code is slow (and how to fix it)",
      "The fastest way to debug JavaScript",
    ],
    instagram: [
      "Morning Dev Setup 🌅",
      "My Home Office Tour 2026",
      "Keyboard Setup for Programmers",
      "Late Night Coding Session",
      "Minimalist Desk Setup",
    ],
    reddit: [
      "TIL about this amazing open source tool",
      "I built the same app 5 times with 5 frameworks",
      "What's your unpopular programming opinion?",
      "Show off your terminal setup",
      "The best VS Code extensions in 2026",
    ],
    soundcloud: [
      "Lofi Study Beats - Chilled Relaxation Mix",
      "Synthwave Sunset - Retro Electronic",
      "Deep Focus - Instrumental Programming Mix",
      "Ambient Works for Coding Sessions",
      "Jazz Hop Beats to Code To",
    ],
    vimeo: [
      "Symphony of Light - Cinematic Experience",
      "Abstract Visuals for Creative Minds",
      "Short Film: The Last Debug Session",
      "Motion Design Showreel 2026",
      "Documentary: The Art of Code",
    ],
    twitch: [
      "Live Coding: Building a Game in Rust",
      "React Components from Scratch",
      "Late Night Hack Session",
      "Code Review with Chat",
      "Building CLI Tools with Node.js",
    ],
    facebook: [
      "How I automated my entire workflow",
      "Coding vs No-Code: Which is better?",
      "The app that changed everything",
      "My journey learning web development",
      "Behind the scenes of our latest feature",
    ],
    twitter: [
      "Hot take: tabs > spaces",
      "Just shipped a new feature!",
      "Thread: Everything I learned about APIs",
      "This library is absolutely insane",
      "POV: You just fixed a 3-day old bug",
    ],
    pinterest: [
      "Ultimate Web Developer Toolkit 2026",
      "Color Palette Generator for Devs",
      "UI/UX Design Inspiration Board",
      "Free Icon Sets for Your Next Project",
      "Typography Guide for Developers",
    ],
    generic: [
      "Media File Extracted for Download",
      "Stream Archive - Processed Content",
      "Download Ready - Optimized Media",
      "Processed Stream File",
      "Extracted Media Content",
    ],
  };

  const title = titles[platform]?.[Math.floor(Math.random() * titles[platform].length)] || "Untitled Media";
  const displayTitle = isPlaylist ? `${title} (Full Playlist)` : title;

  const authorNames: Record<PlatformId, string[]> = {
    youtube: ["TechWithTim", "CodeAcademy", "ThePrimeagen", "Fireship", "WebDevSimplified"],
    tiktok: ["code.with.john", "tech_tok", "dev_raps", "python_wiz", "js_mastery"],
    instagram: ["devgram", "code_daily", "tech_hub", "programmer.life", "dev_setups"],
    reddit: ["u/programmerhumor", "u/coding", "u/webdev", "u/learnprogramming", "u/github"],
    soundcloud: ["Chillhop Music", "LoFi Girl", "Synthwave Nation", "Ambient Realms", "Jazz Hop Cafe"],
    vimeo: ["Visual Arts Lab", "Motion House", "Digital Studio", "Creative Code", "Future Films"],
    twitch: ["ThePrimeagen", "PirateSoftware", "tsoding", "Theo", "LowLevelLearning"],
    facebook: ["Tech Chronicles", "CodeDaily", "DevLife", "WebDev World", "App Builders"],
    twitter: ["@jasonmccb", "@t3dotgg", "@kharioki", "@cassidoo", "@mxstbr"],
    pinterest: ["Design Hub", "Dev Inspiration", "UI Collective", "Creative Code Lab", "Pixel Perfect"],
    generic: ["Content Creator", "Media Producer", "Stream Publisher", "Digital Artist", "Archive Bot"],
  };

  const author = authorNames[platform]?.[Math.floor(Math.random() * authorNames[platform].length)] || "Unknown Author";
  const views = Math.floor(Math.random() * 5000000) + 1000;
  const likes = Math.floor(views * (Math.random() * 0.05 + 0.01));

  const playlistTrackNames: Record<string, string[]> = {
    youtube: ["Introduction & Setup", "Core Concepts Explained", "Hands-On Implementation", "Advanced Techniques", "Real-World Examples", "Performance Optimization", "Testing & Debugging", "Deployment Guide", "Best Practices", "Q&A & Wrap-Up"],
    soundcloud: ["Intro (Ambient Mix)", "Deep House Session", "Lo-Fi Beats", "Chill Electronic", "Synthwave Sunset", "Jazz Fusion", "Ambient Soundscape", "Downtempo Groove"],
    tiktok: ["Day 1 Challenge", "Behind the Scenes", "Tutorial Part 1", "Reaction Video", "Tips & Tricks", "Final Reveal"],
    generic: ["Track 01", "Track 02", "Track 03", "Track 04", "Track 05", "Track 06", "Track 07", "Track 08"],
  };
  const trackNames = isPlaylist ? (playlistTrackNames[platform] || playlistTrackNames.generic) : [];
  const playlistCount = trackNames.length;

  function thumbnailFor(id: string, platform: PlatformId, isPlaylist: boolean): string {
    if (isPlaylist) {
      return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60";
    }
    if (platform === "youtube" && id && id !== "unknown") {
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
    const fallbacks: Record<string, string> = {
      youtube: "https://i.ytimg.com/vi/default/hqdefault.jpg",
      soundcloud: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60",
      vimeo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60",
      twitch: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=60",
      tiktok: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=60",
      instagram: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=60",
      reddit: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60",
      facebook: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&auto=format&fit=crop&q=60",
      twitter: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&auto=format&fit=crop&q=60",
      pinterest: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=800&auto=format&fit=crop&q=60",
      generic: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=60",
    };
    return fallbacks[platform] || fallbacks.generic;
  }

  const formats = generateFormats(platform);

  const tags: Record<PlatformId, string[]> = {
    youtube: ["tutorial", "webdev", "javascript", "react", "programming"],
    tiktok: ["coding", "programming", "shorts", "tips", "tech"],
    instagram: ["setup", "workspace", "coding", "developer", "tech"],
    reddit: ["discussion", "opinion", "showcase", "question", "guide"],
    soundcloud: ["lofi", "chill", "study", "music", "beats"],
    vimeo: ["cinematic", "art", "creative", "short-film", "animation"],
    twitch: ["live", "streaming", "coding", "gaming", "tech"],
    facebook: ["viral", "tips", "howto", "tech", "lifehack"],
    twitter: ["hot-take", "dev", "tech", "thread", "opinion"],
    pinterest: ["design", "ui", "ux", "resources", "tools"],
    generic: ["media", "video", "audio", "download", "stream"],
  };

  const description = isPlaylist
    ? `Full playlist "${title}" by ${author} — ${playlistCount} tracks. Total duration: ${Math.floor(duration / 60)} min.`
    : `This ${platform} content titled "${title}" by ${author} has been analyzed and is ready for download. The media has ${formats.length} quality options available. Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}.`;

  return {
    id,
    url,
    platform,
    title: displayTitle,
    thumbnail: thumbnailFor(id, platform, isPlaylist),
    author,
    authorAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author)}`,
    durationSeconds: duration,
    durationLabel: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`,
    uploadDate,
    views,
    likes,
    description,
    tags: tags[platform] || ["media", "download"],
    isLive: false,
    chapters: [
      { title: "Introduction", start: 0, end: Math.floor(duration * 0.15) },
      { title: "Main Content", start: Math.floor(duration * 0.15), end: Math.floor(duration * 0.85) },
      { title: "Conclusion", start: Math.floor(duration * 0.85), end: duration },
    ],
    formats,
    recommendedFormatId: "best_mp4_1080p",
  ...(isPlaylist && {
    playlistItems: trackNames.map((trackName, i) => {
      const mins = Math.floor(Math.random() * 4) + 2;
      const secs = String(Math.floor(Math.random() * 60)).padStart(2, "0");
      return {
        id: `${id}_p${i + 1}`,
        title: trackName,
        durationLabel: `${mins}:${secs}`,
        sizeLabel: `${(Math.floor(Math.random() * 80) + 15)}.${Math.floor(Math.random() * 9)} MB`,
      };
    }),
  }),
  };
}

interface ActiveJob {
  id: string;
  url: string;
  platform: string;
  title: string;
  thumbnail: string;
  formatId: string;
  quality: string;
  state: DownloadState;
  progress: number;
  speedMbps: number;
  etaSeconds: number;
  fileSizeLabel: string;
  error?: string;
  downloadUrl?: string;
  createdAt: number;
  contentData?: Buffer;
  fileName?: string;
}

const activeJobsStore = new Map<string, ActiveJob>();

setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of activeJobsStore.entries()) {
    if (job.createdAt < tenMinutesAgo) activeJobsStore.delete(id);
  }
}, 10 * 60 * 1000);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    queueSize: activeJobsStore.size,
    cacheSize: 0,
    time: new Date().toISOString(),
  });
});

app.post("/api/analyze-url", metadataLimiter, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "A valid URL string is required." });
    }

    if (isSsrfBlocklisted(url)) {
      return res.status(400).json({
        error: "Access is denied: Invalid, local, or blocklisted network address specified.",
      });
    }

    const platform = extractPlatform(url);
    const metadata = generateMockMetadata(url, platform);
    res.json(metadata);
  } catch (err) {
    console.error("URL analysis error:", err);
    res.status(500).json({
      error: "Could not analyze this URL. The link may be private, age-restricted, or unsupported.",
    });
  }
});

app.post("/api/search", searchLimiter, async (req, res) => {
  try {
    const { query, platform } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query is required." });
    }

    const safeQuery = query.slice(0, 200);
  const platforms = ["youtube", "soundcloud", "vimeo", "twitch", "tiktok"];
  const results: SearchResultItem[] = [];

  const thumbnails = [
    "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=480&fit=crop&q=80",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=480&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=480&fit=crop&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=480&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=480&fit=crop&q=80",
    "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=480&fit=crop&q=80",
  ];

  const numResults = 6;
  for (let i = 0; i < numResults; i++) {
    const p = platform && platform !== "all" ? platform : platforms[i % platforms.length];
    const duration = Math.floor(Math.random() * 900) + 60;
    results.push({
      id: `result_${i}_${Date.now()}`,
      url: p === "youtube"
        ? `https://www.youtube.com/watch?v=${Math.random().toString(36).substring(2, 13)}`
        : p === "soundcloud"
          ? `https://soundcloud.com/${safeQuery.toLowerCase().replace(/\s+/g, "-")}/track-${i}`
          : `https://www.${p}.com/watch/${Math.random().toString(36).substring(2, 10)}`,
      platform: p,
      title: `${safeQuery} - ${["Tutorial", "Review", "Analysis", "Deep Dive", "Overview", "Guide"][i]}`,
      thumbnail: thumbnails[i % thumbnails.length],
      author: [`Creator${i + 1}`, `Channel${i + 1}`, `${p}Star${i}`][i % 3],
      durationLabel: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`,
      durationSeconds: duration,
      viewsLabel: `${(Math.floor(Math.random() * 500) + 1)}K views`,
      uploadDateLabel: `${Math.floor(Math.random() * 30) + 1} ${["days", "weeks", "months"][i % 3]} ago`,
    });
  }

  res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed. Please try again." });
  }
});

app.post("/api/jobs/create", downloadLimiter, (req, res) => {
  const { url, title, thumbnail, platform, formatId, quality, sizeLabel, ext } = req.body;

  if (!url || !title || !formatId) {
    return res.status(400).json({ error: "URL, Title, and Format ID are required." });
  }

  const jobId = `job_${Math.random().toString(36).substring(2, 11)}`;

  const activeJob: ActiveJob = {
    id: jobId,
    url,
    platform: platform || "youtube",
    title,
    thumbnail: thumbnail || "",
    formatId,
    quality: quality || "1080p",
    state: DownloadState.VALIDATING,
    progress: 0,
    speedMbps: 0,
    etaSeconds: 0,
    fileSizeLabel: sizeLabel || "Calculating...",
    createdAt: Date.now(),
    fileName: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext || "mp4"}`,
  };

  activeJobsStore.set(jobId, activeJob);

  const simulationInterval = setInterval(() => {
    const job = activeJobsStore.get(jobId);
    if (!job) { clearInterval(simulationInterval); return; }
    if (job.state === DownloadState.COMPLETED || job.state === DownloadState.FAILED) {
      clearInterval(simulationInterval);
      return;
    }

    if (job.progress < 100) {
      if (job.progress < 15) {
        job.state = DownloadState.FETCHING_METADATA;
        job.progress += 3;
      } else if (job.progress < 30) {
        job.state = DownloadState.ANALYZING;
        job.progress += 4;
      } else if (job.progress < 60) {
        job.state = DownloadState.PROCESSING;
        job.progress += 6;
      } else {
        job.state = DownloadState.DOWNLOADING;
        job.progress += 8;
        job.speedMbps = parseFloat((15 + Math.random() * 45).toFixed(1));
        job.etaSeconds = Math.max(1, Math.round((100 - job.progress) / 4));
      }

      if (job.progress >= 100) {
        job.progress = 100;
        job.state = DownloadState.COMPLETED;
        job.speedMbps = 0;
        job.etaSeconds = 0;
        job.downloadUrl = `/api/download/${jobId}`;
        const dummyText = [
          `NexLoad Media Download`,
          `======================`,
          `Title: ${job.title}`,
          `Platform: ${job.platform}`,
          `Format: ${job.formatId}`,
          `URL: ${job.url}`,
          `Downloaded: ${new Date().toISOString()}`,
          ``,
          `This is a simulated download file from NexLoad.`,
          `In production, this would contain the actual media stream.`,
        ].join("\n");
        job.contentData = Buffer.from(dummyText, "utf-8");
      }

      activeJobsStore.set(jobId, job);
    }
  }, 800);

  res.status(202).json({ jobId, message: "Download job queued successfully." });
});

app.get("/api/jobs/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = activeJobsStore.get(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job ID not found or expired from history." });
  }

  res.json({
    id: job.id, url: job.url, title: job.title, thumbnail: job.thumbnail,
    platform: job.platform, formatId: job.formatId, quality: job.quality,
    state: job.state, progress: job.progress, speedMbps: job.speedMbps,
    etaSeconds: job.etaSeconds, fileSizeLabel: job.fileSizeLabel,
    error: job.error, downloadUrl: job.downloadUrl,
  });
});

app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error. Please try again." });
});

app.get("/api/jobs/:jobId/progress", (req, res) => {
  const { jobId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendProgress = () => {
    const job = activeJobsStore.get(jobId);
    if (!job) {
      res.write(`data: ${JSON.stringify({ type: "error", code: "JOB_NOT_FOUND", message: "Job not found" })}\n\n`);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify({ type: "progress", percent: job.progress, speed: `${job.speedMbps}mb/s`, eta: job.etaSeconds })}\n\n`);

    if (job.state === DownloadState.COMPLETED) {
      res.write(`data: ${JSON.stringify({ type: "complete", downloadUrl: `/api/download/${jobId}` })}\n\n`);
      res.end();
    } else if (job.state === DownloadState.FAILED) {
      res.write(`data: ${JSON.stringify({ type: "error", code: "PROCESSING_FAILED", message: job.error || "Processing failed" })}\n\n`);
      res.end();
    }
  };

  const interval = setInterval(sendProgress, 500);
  sendProgress();

  req.on("close", () => {
    clearInterval(interval);
  });
});

app.get("/api/download/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = activeJobsStore.get(jobId);

  if (!job || !job.contentData) {
    return res.status(404).send("Download asset not found or expired from server cache.");
  }

  res.setHeader("Content-Disposition", `attachment; filename="${job.fileName}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  res.send(job.contentData);
});

app.get("/api/platforms", (_req, res) => {
  res.json([
    { name: "YouTube", capabilities: ["video", "audio", "playlist", "live"] },
    { name: "TikTok", capabilities: ["video", "audio"] },
    { name: "Instagram", capabilities: ["video", "audio", "image"] },
    { name: "SoundCloud", capabilities: ["audio", "playlist"] },
    { name: "Twitch", capabilities: ["video", "live"] },
    { name: "Twitter/X", capabilities: ["video", "audio"] },
    { name: "Reddit", capabilities: ["video", "audio"] },
    { name: "Pinterest", capabilities: ["image", "video"] },
    { name: "Vimeo", capabilities: ["video", "audio"] },
    { name: "Facebook", capabilities: ["video", "audio"] },
  ]);
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NexLoad Engine booted on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Server failed to start:", err);
});
