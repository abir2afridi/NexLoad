/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { DownloadState, MediaMetadata, SearchResultItem } from "./src/types";

// Initialize Gemini API client with appropriate headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

// Enable trust proxy so express-rate-limit works behind Nginx or Cloud Run proxies
app.set("trust proxy", 1);

// JSON body parsing size limit
app.use(express.json({ limit: "5mb" }));

// Security Headers with Helmet (Custom configuration to support iframe rendering and styling)
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

// Apply CORS manually with custom allows to ensure zero sandbox limitations
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Rate limiters (Security Architecture Part 10)
const metadataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per IP
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

// SSRF Blocklist Validation (Security Architecture Sec 10)
function isSsrfBlocklisted(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();

    // Check specific hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "metadata.google.internal" ||
      hostname === "metadata" ||
      hostname === "169.254.169.254"
    ) {
      return true;
    }

    // SSRF IP subnets / private network patterns
    const privateIpRegex = /^(0\.|10\.|100\.64\.|127\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.0\.0\.|192\.168\.|198\.18\.|198\.51\.100\.|203\.0\.113\.|240\.)/;
    if (privateIpRegex.test(hostname)) {
      return true;
    }

    return false;
  } catch {
    return true; // Block invalid URLs
  }
}

// In-Memory Database/Job Queue Store (emulates BullMQ)
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
  contentData?: Buffer; // mock created file
  fileName?: string;
}

const activeJobsStore = new Map<string, ActiveJob>();

// Cleanup old jobs every 10 minutes (Task Lifecycle & Memory management)
setInterval(() => {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of activeJobsStore.entries()) {
    if (job.createdAt < tenMinutesAgo) {
      activeJobsStore.delete(id);
    }
  }
}, 10 * 60 * 1000);

// Platform details extraction
function extractPlatform(urlStr: string): MediaMetadata["platform"] {
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

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// URL Intelligence Analysis Endpoint
app.post("/api/analyze-url", metadataLimiter, async (req, res) => {
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

  try {
    // We use Gemini API (gemini-3.5-flash) to parsed and intelligence analyzed URLs dynamically
    // It predicts content-type, generates formatting ladder, adds related chapters and playlists
    const prompt = `
      Analyze this ${platform} URL: "${url}".
      Please output a structured JSON response matching the following TypeScript schema for MediaMetadata.
      
      Generate highly realistic and authentic estimates of download metadata. Do not return empty fields.
      
      If the URL contains playlist / compilation info (e.g. "list=", "playlist", "album", "set", "compilation") or if it's a popular media file, generate a highly realistic set of 4 to 7 tracks in a "playlistItems" array to enable batch downloading options.
      
      Structure:
      {
        "id": "unique_string_id",
        "url": "${url}",
        "platform": "${platform}",
        "title": "Clean parsed title based on the URL tokens",
        "thumbnail": "High-quality representative image URL (or placehold image)",
        "author": "Creator / Channel name",
        "authorAvatar": "Avatar URL",
        "durationSeconds": 312,
        "durationLabel": "5:12",
        "uploadDate": "2026-06-15T12:00:00Z",
        "views": 450200,
        "likes": 28400,
        "description": "Exquisite summary description of the video or media asset.",
        "tags": ["tag1", "tag2"],
        "isLive": false,
        "viewerCount": 0,
        "chapters": [
          {"title": "Introduction", "start": 0, "end": 45},
          {"title": "Deep Dive Segment", "start": 45, "end": 200},
          {"title": "Summary / Outro", "start": 200, "end": 312}
        ],
        "formats": [
          {
            "id": "best_mp4_1080p",
            "ext": "mp4",
            "resolution": "1080p",
            "qualityLabel": "1080p (60fps) MP4",
            "fps": 60,
            "sizeBytes": 78643200,
            "sizeLabel": "75.0 MB",
            "hasVideo": true,
            "hasAudio": true,
            "container": "mp4"
          },
          {
            "id": "medium_mp4_720p",
            "ext": "mp4",
            "resolution": "720p",
            "qualityLabel": "720p (30fps) MP4",
            "fps": 30,
            "sizeBytes": 41943040,
            "sizeLabel": "40.0 MB",
            "hasVideo": true,
            "hasAudio": true,
            "container": "mp4"
          },
          {
            "id": "highest_audio_mp3",
            "ext": "mp3",
            "resolution": "Audio Only",
            "qualityLabel": "Audio Only - High (320kbps MP3)",
            "sizeBytes": 12582912,
            "sizeLabel": "12.0 MB",
            "hasVideo": false,
            "hasAudio": true,
            "bitrate": 320,
            "container": "mp3"
          }
        ],
        "recommendedFormatId": "best_mp4_1080p",
        "playlistItems": [
          {"id": "play_1", "title": "First Song Name", "durationLabel": "4:05", "thumbnail": "https://images.unsplash.com/..."},
          {"id": "play_2", "title": "Second Song Name", "durationLabel": "3:40", "thumbnail": "https://images.unsplash.com/..."}
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            url: { type: Type.STRING },
            platform: { type: Type.STRING },
            title: { type: Type.STRING },
            thumbnail: { type: Type.STRING },
            author: { type: Type.STRING },
            authorAvatar: { type: Type.STRING },
            durationSeconds: { type: Type.INTEGER },
            durationLabel: { type: Type.STRING },
            uploadDate: { type: Type.STRING },
            views: { type: Type.INTEGER },
            likes: { type: Type.INTEGER },
            description: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            isLive: { type: Type.BOOLEAN },
            viewerCount: { type: Type.INTEGER },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  start: { type: Type.INTEGER },
                  end: { type: Type.INTEGER },
                },
                required: ["title", "start", "end"],
              },
            },
            formats: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  ext: { type: Type.STRING },
                  resolution: { type: Type.STRING },
                  qualityLabel: { type: Type.STRING },
                  fps: { type: Type.INTEGER },
                  sizeBytes: { type: Type.INTEGER },
                  sizeLabel: { type: Type.STRING },
                  hasVideo: { type: Type.BOOLEAN },
                  hasAudio: { type: Type.BOOLEAN },
                  bitrate: { type: Type.INTEGER },
                  container: { type: Type.STRING },
                },
                required: ["id", "ext", "resolution", "qualityLabel", "hasVideo", "hasAudio", "container"],
              },
            },
            recommendedFormatId: { type: Type.STRING },
            playlistItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  durationLabel: { type: Type.STRING },
                  thumbnail: { type: Type.STRING },
                  author: { type: Type.STRING },
                  sizeLabel: { type: Type.STRING },
                },
                required: ["id", "title", "durationLabel"],
              },
            },
          },
          required: ["id", "url", "platform", "title", "thumbnail", "author", "durationSeconds", "durationLabel", "formats"],
        },
      },
    });

    const parsedData = JSON.parse(response.text?.trim() || "{}") as MediaMetadata;
    
    // Fallback images if not set properly or returning generic URL
    if (!parsedData.thumbnail || parsedData.thumbnail.includes("placeholder")) {
      parsedData.thumbnail = `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=60`;
    }
    if (!parsedData.authorAvatar) {
      parsedData.authorAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(parsedData.author)}`;
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("URL Analysis error:", error);
    res.status(500).json({
      error: "Failed to fetch metadata. Private, age-restricted, or invalid resource link.",
    });
  }
});

// Search Layer Endpoint (Part 4.3)
app.post("/api/search", searchLimiter, async (req, res) => {
  const { query, platform } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Search query is required." });
  }

  try {
    const prompt = `
      The user is searching for "${query}" on NexLoad (media downloader).
      Please generate 6 highly relevant search results for the platform: "${platform || "all"}".
      
      Generate highly realistic metadata.
      Structure the response as a JSON array matching the TypeScript SearchResultItem[] array:
      [
        {
          "id": "result_id_1",
          "url": "https://www.youtube.com/watch?v=unique_id_1",
          "platform": "youtube",
          "title": "Clean highly matching title",
          "thumbnail": "High-quality representative thumbnail Unsplash URL (use Unsplash search queries formatted like https://images.unsplash.com/photo-XXX?w=480&fit=crop...)",
          "author": "Creator Channel Name",
          "durationLabel": "4:20",
          "durationSeconds": 260,
          "viewsLabel": "1.2M views",
          "uploadDateLabel": "2 months ago"
        }
      ]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              url: { type: Type.STRING },
              platform: { type: Type.STRING },
              title: { type: Type.STRING },
              thumbnail: { type: Type.STRING },
              author: { type: Type.STRING },
              durationLabel: { type: Type.STRING },
              durationSeconds: { type: Type.INTEGER },
              viewsLabel: { type: Type.STRING },
              uploadDateLabel: { type: Type.STRING },
            },
            required: ["id", "url", "platform", "title", "thumbnail", "author", "durationLabel", "durationSeconds"],
          },
        },
      },
    });

    const parsedResults = JSON.parse(response.text?.trim() || "[]") as SearchResultItem[];
    
    // Guarantee fallback thumbnails look stunning
    const fallbackPhotos = [
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=480&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=480&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=480&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=480&fit=crop&q=80",
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=480&fit=crop&q=80",
      "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=480&fit=crop&q=80"
    ];

    parsedResults.forEach((item, index) => {
      if (!item.thumbnail || !item.thumbnail.startsWith("http")) {
        item.thumbnail = fallbackPhotos[index % fallbackPhotos.length];
      }
    });

    res.json(parsedResults);
  } catch (error) {
    console.error("Search API failure:", error);
    res.status(500).json({ error: "Failed to dispatch search queries. Service temporarily busy." });
  }
});

// Trigger download job (Starts media workflow queue)
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

  // Background state machine runner using interval (Part 6)
  let statusCycle = [
    { state: DownloadState.FETCHING_METADATA, text: "Checking secure endpoint link..." },
    { state: DownloadState.ANALYZING, text: "Running content quality negotiation..." },
    { state: DownloadState.PROCESSING, text: "FFmpeg pipeline processing video+audio stream muxing..." },
    { state: DownloadState.DOWNLOADING, text: "Downloading stream blocks..." },
  ];

  let currentCycleIdx = 0;
  
  const simulationInterval = setInterval(() => {
    const job = activeJobsStore.get(jobId);
    if (!job) {
      clearInterval(simulationInterval);
      return;
    }

    if (job.state === DownloadState.COMPLETED || job.state === DownloadState.FAILED) {
      clearInterval(simulationInterval);
      return;
    }

    if (job.progress < 100) {
      // Advance work cycle
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
        
        // Generate actual mock downloadable content so the file downloads works
        // We write out a simple media file for client to trigger save
        const dummyText = `NexLoad Media Downloader Output File\n==================================\nTitle: ${job.title}\nPlatform: ${job.platform}\nFormat: ${job.formatId}\nUrl: ${job.url}\nDownloaded at: ${new Date().toISOString()}`;
        job.contentData = Buffer.from(dummyText, "utf-8");
      }

      activeJobsStore.set(jobId, job);
    }
  }, 800);

  res.status(202).json({ jobId, message: "Download job queued successfully." });
});

// Job checking endpoint
app.get("/api/jobs/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = activeJobsStore.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: "Job ID not found or expired from history." });
  }

  res.json({
    id: job.id,
    url: job.url,
    title: job.title,
    thumbnail: job.thumbnail,
    platform: job.platform,
    formatId: job.formatId,
    quality: job.quality,
    state: job.state,
    progress: job.progress,
    speedMbps: job.speedMbps,
    etaSeconds: job.etaSeconds,
    fileSizeLabel: job.fileSizeLabel,
    error: job.error,
    downloadUrl: job.downloadUrl,
  });
});

// Serve download payload to the browser (triggers browser native file save dialog)
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

// Vite middleware setup or static distribution serving
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NexLoad Engine booted on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Vite server failed to start:", err);
});
