/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import { DownloadState, MediaMetadata, SearchResultItem, MediaFormat } from "./src/types";

const app = express();
const PORT = 3000;

const DOWNLOAD_DIR = path.join(os.tmpdir(), "nexload-downloads");
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

const FFMPEG_PATH = (() => {
  const candidates = [
    // Common installation locations on Windows
    path.join(os.homedir(), "AppData", "Local", "Programs", "ffmpeg", "bin", "ffmpeg.exe"),
    path.join(os.homedir(), "AppData", "Roaming", "ffmpeg", "ffmpeg.exe"),
    "ffmpeg",
    "ffmpeg.exe",
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return null;
})();

const YTDLP_PATH = (() => {
  const candidates = [
    path.join(os.homedir(), "AppData", "Roaming", "Python", "Python313", "Scripts", "yt-dlp.exe"),
    "yt-dlp",
    "yt-dlp.exe",
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return "yt-dlp";
})();

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
  fileName: string;
  filePath?: string;
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

function u32(v: number): Buffer {
  const b = Buffer.alloc(4); b.writeUInt32BE(v, 0); return b;
}
function u16(v: number): Buffer {
  const b = Buffer.alloc(2); b.writeUInt16BE(v, 0); return b;
}
function u8(v: number): Buffer {
  const b = Buffer.alloc(1); b[0] = v; return b;
}
function box(type: string, content: Buffer): Buffer {
  return Buffer.concat([u32(8 + content.length), Buffer.from(type, "ascii"), content]);
}
function fullBox(type: string, ver: number, flags: number, content: Buffer): Buffer {
  return box(type, Buffer.concat([u8(ver), u32(flags).subarray(1), content]));
}
function f16(v: number): Buffer {
  const int = Math.floor(v); const frac = Math.round((v - int) * 65536);
  return Buffer.concat([u16(int), u16(frac)]);
}
function f8(v: number): Buffer {
  const int = Math.floor(v); const frac = Math.round((v - int) * 256);
  return Buffer.concat([u16((int << 8) | Math.min(frac, 255))]);
}

function generateMockFileContent(ext: string): Buffer {
  const extLc = ext.toLowerCase();
  switch (extLc) {
    case "mp4":
    case "m4v":
    case "mov":
    case "3gp": {
      const isQtv = extLc === "mov";
      const majorBrand = isQtv ? "qt  " : "isom";
      const brands = isQtv ? ["qt  "] : ["isom", "iso2", "mp41"];
      const ftypContent = Buffer.concat([
        Buffer.from(majorBrand, "ascii"), u32(0x00000200),
        Buffer.from(brands.join(""), "ascii"),
      ]);
      // mvhd: movie header
      const mvhd = fullBox("mvhd", 0, 0, Buffer.concat([
        u32(0), u32(0), u32(90000), u32(0),
        f16(1), f8(1), Buffer.alloc(10), Buffer.alloc(36), Buffer.alloc(24), u32(1),
      ]));
      // tkhd: track header (zero duration, no width/height)
      const tkhd = fullBox("tkhd", 0, 0x0003, Buffer.concat([
        u32(0), u32(0), u32(1), u32(0), u32(0),
        Buffer.alloc(8), u16(0), u16(0), f8(0), u16(0),
        Buffer.alloc(36), f16(0), f16(0),
      ]));
      // mdhd: media header
      const mdhd = fullBox("mdhd", 0, 0, Buffer.concat([
        u32(0), u32(0), u32(90000), u32(0), u16(0x55C4), u16(0),
      ]));
      // hdlr: handler reference (video)
      const hdlr = fullBox("hdlr", 0, 0, Buffer.concat([
        u32(0), Buffer.from("vide", "ascii"), Buffer.alloc(12), u8(0),
      ]));
      // vmhd: video media header
      const vmhd = fullBox("vmhd", 0, 1, Buffer.alloc(8));
      // dref: data reference (self-contained)
      const urlBox = box("url ", Buffer.concat([u8(0), u32(1).subarray(1)]));
      const dref = fullBox("dref", 0, 0, Buffer.concat([u32(1), urlBox]));
      // stsd: sample description (1 empty entry)
      const visualEntry = Buffer.concat([
        Buffer.alloc(6), u16(1), u16(0), Buffer.alloc(16),
        u16(1), u16(1), f16(72), f16(72), u32(0), u16(1),
        Buffer.alloc(32), u16(24), u16(0xFFFF),
      ]);
      const stsd = fullBox("stsd", 0, 0, Buffer.concat([u32(1), visualEntry]));
      // stts, stsc, stsz, stco: empty sample tables
      const stts = fullBox("stts", 0, 0, u32(0));
      const stsc = fullBox("stsc", 0, 0, u32(0));
      const stsz = fullBox("stsz", 0, 0, Buffer.concat([u32(0), u32(0)]));
      const stco = fullBox("stco", 0, 0, u32(0));
      const stbl = box("stbl", Buffer.concat([stsd, stts, stsc, stsz, stco]));
      const minf = box("minf", Buffer.concat([vmhd, box("dinf", dref), stbl]));
      const mdia = box("mdia", Buffer.concat([mdhd, hdlr, minf]));
      const trak = box("trak", Buffer.concat([tkhd, mdia]));
      const moov = box("moov", Buffer.concat([mvhd, trak]));
      return Buffer.concat([box("ftyp", ftypContent), moov]);
    }
    case "webm":
    case "mkv": {
      const docType = extLc === "webm" ? "webm" : "matroska";
      const ebml = Buffer.from([
        0x1A, 0x45, 0xDF, 0xA3, // EBML header
        0x86, 0x81, 0x01, // EBMLVersion = 1
        0x42, 0xF7, 0x81, 0x01, // EBMLReadVersion = 1
        0x42, 0xF2, 0x81, 0x04, // EBMLMaxIDLength = 4
        0x42, 0xF3, 0x81, 0x08, // EBMLMaxSizeLength = 8
        0x42, 0x82,
      ]);
      const docTypeBuf = Buffer.from(docType, "ascii");
      const docTypeLen = u8(docTypeBuf.length);
      const docTypePart = Buffer.concat([docTypeLen, docTypeBuf, u32(1).subarray(1), u32(1).subarray(1)]);
      return Buffer.concat([ebml, Buffer.from([0x84]), docTypePart, Buffer.from([0x1C, 0x53, 0xBB, 0x6B])]);
    }
    case "avi": {
      const riffSize = u32(0);
      const aviHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
        0x4C, 0x49, 0x53, 0x54, 0x00, 0x00, 0x00, 0x00, 0x68, 0x64, 0x72, 0x6C, 0x61, 0x76, 0x69, 0x68,
      ]);
      return Buffer.concat([aviHeader, Buffer.alloc(64)]);
    }
    case "mp3": {
      const frames: Buffer[] = [];
      for (let s = 0; s < 300; s += 1152) {
        frames.push(Buffer.from([
          0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]));
      }
      return Buffer.concat(frames);
    }
    case "wav": {
      const dataSize = 16000;
      const fmt = Buffer.concat([
        Buffer.from("fmt ", "ascii"), u32(16), u16(1), u16(1),
        u32(8000), u32(16000), u16(2), u16(16),
      ]);
      const data = Buffer.concat([
        Buffer.from("data", "ascii"), u32(dataSize), Buffer.alloc(dataSize),
      ]);
      const riff = Buffer.concat([
        Buffer.from("RIFF", "ascii"),
        u32(36 + dataSize), Buffer.from("WAVE", "ascii"), fmt, data,
      ]);
      return riff;
    }
    case "flac": {
      return Buffer.from([
        0x66, 0x4C, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22,
        0x12, 0x00, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
    }
    case "ogg":
    case "opus": {
      return Buffer.from([
        0x4F, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x72, 0x76,
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
    }
    case "aac": {
      return Buffer.alloc(2048, 0xFF);
    }
    case "jpg":
    case "jpeg": {
      return Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
        0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
        0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
        0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
        0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF,
        0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x7D, 0x01, 0x02,
        0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31,
        0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71,
        0x14, 0x32, 0x81, 0x91, 0xA1, 0x08, 0x23, 0x42,
        0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33,
        0x62, 0x72, 0x82, 0x09, 0x0A, 0x16, 0x17, 0x18,
        0x19, 0x1A, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A,
        0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43,
        0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x53,
        0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x63,
        0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73,
        0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x83,
        0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x92,
        0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A,
        0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9,
        0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8,
        0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7,
        0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6,
        0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4,
        0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2,
        0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA,
        0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
        0x3F, 0x00, 0xFF, 0xD9,
      ]);
    }
    case "png": {
      const crc32 = (buf: Buffer): number => {
        let c = 0xFFFFFFFF;
        for (let n = 0; n < buf.length; n++) {
          c ^= buf[n];
          for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
        }
        return (c ^ 0xFFFFFFFF) >>> 0;
      };
      const ihdr = Buffer.concat([
        Buffer.from("IHDR", "ascii"),
        u32(1), u32(1), u8(8), u8(2), u8(0), u8(0), u8(0),
      ]);
      const ihdrChunk = Buffer.concat([
        u32(13), ihdr, u32(crc32(ihdr)),
      ]);
      const idatRaw = Buffer.from([0x08, 0x1D, 0x01, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x0F, 0xFC, 0xD9]);
      const idat = Buffer.concat([
        Buffer.from("IDAT", "ascii"), u32(idatRaw.length), idatRaw, u32(crc32(Buffer.concat([Buffer.from("IDAT", "ascii"), idatRaw]))),
      ]);
      const iend = Buffer.concat([
        Buffer.from("IEND", "ascii"), u32(0), u32(crc32(Buffer.from("IEND", "ascii"))),
      ]);
      return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), ihdrChunk, idat, iend]);
    }
    case "gif": {
      return Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
        0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
        0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3B,
      ]);
    }
    case "webp": {
      return Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x2A, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
        0x1E, 0x00, 0x00, 0x00, 0x30, 0x00, 0x00, 0x00,
        0x04, 0x04, 0x00, 0x00, 0x2D, 0x01, 0x00, 0x00,
        0xFE, 0x08, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04,
        0x80, 0x00,
      ]);
    }
    default:
      return Buffer.from(`NexLoad simulated download for .${ext} format.`, "utf-8");
  }
}

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

  const outTemplate = path.join(DOWNLOAD_DIR, `${jobId}_%(title)s.%(ext)s`);
  const extArg = ext || "mp4";

  const ytdlpArgs = [
    url,
    "-o", outTemplate,
    "--no-playlist",
    "--newline",
    "--no-check-certificates",
  ];

  const ffmpegAvailable = !!FFMPEG_PATH;

  // Derive a height filter from the requested quality (e.g., "1080p" -> "[height<=1080]")
  let heightFilter = "";
  if (quality) {
    const m = quality.match(/(\d+)p/);
    if (m) heightFilter = `[height<=${m[1]}]`;
  }

  if (["mp4", "m4v", "mkv", "webm", "avi", "mov"].includes(extArg)) {
    if (ffmpegAvailable) {
      // Prefer a pre‑muxed combined format first, then fall back to separate streams that need merging.
      ytdlpArgs.push(
        "-f",
        `best${heightFilter}[ext=${extArg}][acodec!=none][vcodec!=none]/bestvideo${heightFilter}[ext=${extArg}]+bestaudio[ext=m4a]`,
        "--merge-output-format",
        extArg
      );
    } else {
      // No ffmpeg: only use formats that already contain both audio and video (no merge).
      ytdlpArgs.push("-f", `best${heightFilter}[ext=${extArg}][acodec!=none][vcodec!=none]`);
    }
  } else if (["mp3", "wav", "flac", "aac", "opus", "ogg"].includes(extArg)) {
    ytdlpArgs.push("-x", "--audio-format", extArg);
  } else {
    ytdlpArgs.push("-f", "best");
  }

  console.log(`[yt-dlp] Spawning: ${YTDLP_PATH} ${ytdlpArgs.join(" ")}`);
  const proc = spawn(YTDLP_PATH, ytdlpArgs, { windowsHide: true });

  let stderrData = "";
  proc.stdout.on("data", (chunk: Buffer) => {
    const line = chunk.toString();
    const match = line.match(/(\d+\.?\d*)%/);
    if (match) {
      const pct = Math.min(99, parseFloat(match[1]));
      const job = activeJobsStore.get(jobId);
      if (job) {
        job.progress = pct;
        job.state = pct < 30 ? DownloadState.ANALYZING : DownloadState.DOWNLOADING;
        activeJobsStore.set(jobId, job);
      }
    }
  });

  proc.stderr.on("data", (chunk: Buffer) => { stderrData += chunk.toString(); });

  proc.on("close", (code) => {
    const job = activeJobsStore.get(jobId);
    if (!job) return;

    if (code === 0) {
      const files = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith(jobId)).sort();
      if (files.length > 0) {
        const filePath = path.join(DOWNLOAD_DIR, files[0]);
        const stat = fs.statSync(filePath);
        job.progress = 100;
        job.state = DownloadState.COMPLETED;
        job.speedMbps = 0;
        job.etaSeconds = 0;
        job.downloadUrl = `/api/download/${jobId}`;
        job.filePath = filePath;
        job.fileName = files[0].replace(new RegExp(`^${jobId}_`), "");
        job.fileSizeLabel = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        job.state = DownloadState.FAILED;
        job.error = "Download completed but file not found on disk.";
      }
    } else {
      job.state = DownloadState.FAILED;
      job.error = stderrData.substring(0, 200) || `yt-dlp exited with code ${code}`;
    }
    activeJobsStore.set(jobId, job);
  });

  proc.on("error", (err) => {
    const job = activeJobsStore.get(jobId);
    if (!job) return;
    job.state = DownloadState.FAILED;
    job.error = `Failed to start download: ${err.message}`;
    activeJobsStore.set(jobId, job);
  });

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

  if (!job || !job.filePath) {
    return res.status(404).send("Download asset not found or expired from server cache.");
  }

  if (!fs.existsSync(job.filePath)) {
    return res.status(404).send("Download file no longer exists on server.");
  }

  const mimeType: Record<string, string> = {
    mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mkv: "video/x-matroska",
    avi: "video/x-msvideo", mov: "video/quicktime",
    mp3: "audio/mpeg", wav: "audio/wav", flac: "audio/flac", aac: "audio/aac",
    opus: "audio/opus", ogg: "audio/ogg",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp",
  };
  const ext = job.fileName.split(".").pop() || "";
  res.setHeader("Content-Disposition", `attachment; filename="${job.fileName}"`);
  res.setHeader("Content-Type", mimeType[ext] || "application/octet-stream");
  res.sendFile(job.filePath);
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
