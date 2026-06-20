Copy all

Build a production-grade, next-generation media downloader web application called NexLoad. Inspired by the UX philosophy of Cobalt (imputnet/cobalt) — minimal, fast, zero-friction — but built entirely from scratch with original branding, original architecture, and an integrated intelligent browsing layer.

═══════════════════════════════════════
PART 0 — ABSOLUTE RULES (READ FIRST)
═══════════════════════════════════════

DATABASE RULES — STRICTLY ENFORCED:
This project must NOT use any database. Zero. None.

DO NOT use:
- Supabase / Firebase / PocketBase
- PostgreSQL / MySQL / SQLite / MongoDB
- Redis (as persistent storage or queue)
- Any ORM (Prisma, Drizzle, TypeORM, Sequelize)
- Any database migration system
- Any database connection library

ALLOWED storage only:
✓ Browser LocalStorage (settings, preferences)
✓ Browser IndexedDB via Dexie.js (download history, max 500 entries)
✓ Browser SessionStorage (temporary UI state)
✓ Server in-memory cache (Map / LRU cache, rebuilds on restart)
✓ Server temporary filesystem (/tmp/nexload — auto-cleaned after 10min)

AI INTEGRATION RULES — STRICTLY ENFORCED:
This project must NOT use any AI service, API, or model.

DO NOT use:
- OpenAI API / GPT / ChatGPT
- Anthropic Claude API
- Google Gemini / Vertex AI
- Hugging Face models
- LangChain / LlamaIndex
- Any LLM SDK or wrapper
- Any AI-generated captions, summaries, or recommendations
- Any vector embeddings or semantic search

AUTH RULES — STRICTLY ENFORCED:
- No login system
- No user accounts
- No sessions (server-side)
- No JWT tokens
- No OAuth
- No passwords
- No user IDs
- App works fully for anonymous users only

═══════════════════════════════════════
PART 1 — PROJECT IDENTITY
═══════════════════════════════════════

Name: NexLoad
Tagline: "Download anything. Instantly."
Brand voice: Clean. Fast. Honest. No tracking. No ads.
Color system: Deep neutral dark mode + electric purple accent (#7C3AED, user-selectable)
Logo: Geometric "N" with downward arrow, SVG, inline

═══════════════════════════════════════
PART 2 — CORE PHILOSOPHY
═══════════════════════════════════════

- One screen does everything. No page navigation.
- Zero cognitive load. Paste URL → get file.
- Keyboard-first. Fully operable without mouse.
- WCAG 2.1 AA accessibility minimum.
- Privacy-first. No analytics. No fingerprinting. No tracking.
- Mobile-first responsive (320px to 4K).
- Animate with purpose only.
- Every interaction < 100ms perceived latency.

═══════════════════════════════════════
PART 3 — TECH STACK (STRICT)
═══════════════════════════════════════

Frontend (apps/web):
- React 18 + TypeScript (strict mode, zero any types)
- Vite 5
- TailwindCSS 3
- Framer Motion (animations)
- Zustand + zustand/middleware persist (to localStorage)
- TanStack Query v5 (server state, no DB)
- React Hook Form + Zod (URL validation)
- Dexie.js (IndexedDB wrapper — for history only)
- Lucide React (icons)
- NO next.js, NO remix, NO SSR framework

Backend (apps/server):
- Node.js 20 LTS
- Express 5 + TypeScript
- Helmet.js (security headers)
- express-rate-limit (in-memory store — no Redis)
- Winston (structured logging to stdout only)
- Joi (server-side input validation)
- Undici (fast HTTP client)
- fluent-ffmpeg (media processing)
- node-lru-cache (in-memory metadata cache)
- yt-dlp (spawned subprocess — main media engine)
- p-queue (in-memory job queue — no BullMQ, no Redis)
- NO BullMQ, NO Redis, NO database drivers

Infrastructure:
- Docker + docker-compose (web + server only, no DB containers)
- Nginx reverse proxy
- GitHub Actions CI

═══════════════════════════════════════
PART 4 — STORAGE ARCHITECTURE
═══════════════════════════════════════

4.1 — Frontend Storage (Browser)

Settings → Zustand store with persist middleware → localStorage key: "nexload_settings"
Schema:
{
  theme: 'dark' | 'light' | 'system',
  accentColor: string,
  defaultQuality: 'best' | '4k' | '1080p' | '720p' | '480p' | '360p',
  defaultAudioFormat: 'mp3' | 'wav' | 'aac' | 'flac' | 'opus',
  mp3Bitrate: 128 | 192 | 320,
  autoDownload: boolean,
  filenameTemplate: string,
  concurrentDownloads: number,
  youtubeApiKey: string,
  searchRegion: string,
  safeSearch: boolean,
  proxyUrl: string,
  apiEndpoint: string,
  requestTimeout: number,
  maxRetries: number
}

Download History → Dexie.js → IndexedDB database: "nexload_db"
Table: downloads
Schema: {
  id: string (uuid, auto),
  url: string,
  platform: string,
  title: string,
  thumbnail: string,
  author: string,
  duration: number,
  format: string,
  quality: string,
  fileSize: number,
  downloadedAt: Date,
  status: 'completed' | 'failed'
}
Rules:
- Max 500 entries total
- When adding entry #501+: delete oldest entry first
- Expose: add(), getAll(), getById(), delete(), clear(), search(), export()

UI State → Zustand store (no persist) → memory only
- Current URL input value
- Preview panel open/closed
- Active tab in browser panel
- Download queue items
- Toast notifications

4.2 — Backend Storage (Server)

In-memory metadata cache:
- Use node-lru-cache
- Max 200 entries
- TTL: 5 minutes per entry
- Key: normalized URL string
- Value: full MediaMetadata object
- Eviction: LRU (least recently used)
- Rebuilds automatically on server restart

In-memory job queue:
- Use p-queue library
- Concurrency: configurable (default 3)
- Priority queue: metadata jobs > download jobs > cleanup jobs
- Job states stored in Map
- Auto-cleared after job completion + 10 minutes
- No persistence — rebuilds on restart (by design)

Temp file system:
- Directory: process.env.TEMP_DIR || /tmp/nexload
- Files deleted after 10 minutes (setInterval cleanup)
- Filename: {jobId}_{timestamp}.{ext}
- Max total size check: reject if /tmp usage > 10GB

═══════════════════════════════════════
PART 5 — INTELLIGENT BROWSING SYSTEM
═══════════════════════════════════════

(Primary differentiator vs Cobalt — no AI involved, pure API calls)

5.1 — Smart URL Intelligence Engine

Pipeline when user pastes URL:
  a) URL normalization + sanitization (server-side)
  b) Platform detection (regex hostname matching)
  c) Content-type prediction (video/audio/playlist/live/image)
  d) Metadata fetch via platform adapter
  e) Quality ladder generation (all available resolutions)
  f) Estimated file sizes per quality (calculated from bitrate × duration)

5.2 — In-App Media Preview Panel

After URL paste, slide-in panel shows:
  - Thumbnail (lazy loaded, AVIF/WebP with fallback)
  - Title (smart truncate at 80 chars)
  - Author / channel name
  - Upload date (relative: "3 days ago" + absolute on hover)
  - Duration (formatted: HH:MM:SS)
  - View count formatted (1.2M, 45K)
  - Tags (first 5, chips)
  - Description (collapsed, expand on click, 3-line clamp)
  - Chapter markers (if available, clickable timeline)
  - Quality selector grid
  - Format toggle (video / audio only)
  - Download button (primary CTA)

5.3 — Search Layer

Search bar in browser panel dispatches to:
  a) YouTube Data API v3 — if YOUTUBE_API_KEY set in .env
  b) Invidious public instances — fallback, no key needed
     Instances to try in order: invidious.io, yewtu.be, vid.puffyan.us
  c) SoundCloud search — if SOUNDCLOUD_CLIENT_ID set
  d) Generic: user can paste any URL from any site

Results render as cards:
  - Thumbnail (lazy)
  - Title (2-line clamp)
  - Channel name
  - Duration badge
  - View count
  - Upload date (relative)
  - Click → fills URL input → triggers metadata fetch

Trending section:
  - Fetch from Invidious trending endpoint (no API key needed)
  - Cache in-memory for 30 minutes
  - Show top 12 videos in grid

5.4 — Platform-Aware Browsing

YouTube:
  - Playlist URL → fetch all items, show count + total duration
  - Channel URL → fetch latest 20 videos
  - Shorts detection → label with "Short" badge
  - Live detection → label with "LIVE" badge + viewer count

TikTok: user video URL → show user's recent videos
SoundCloud: track URL → show artist's other tracks
Reddit: video post → show other video posts from subreddit

5.5 — Live Stream Detection

Detect via metadata: isLive: boolean
If live:
  - Show red "LIVE" pulsing badge
  - Show viewer count (if available)
  - Disable standard download
  - Show "Record live" mode:
    - Duration selector: 1min / 5min / 15min / 30min / custom
    - Segment-based download (m3u8 recording via ffmpeg)
    - Progress bar with live recording timer

5.6 — Playlist / Batch Intelligence

Detect playlist URLs automatically.
Show:
  - Playlist title + thumbnail
  - Total item count
  - Total duration
  - Estimated total file size
  - Item list with checkboxes (select all / deselect all)
  - Each item: thumbnail, title, duration, status indicator
  
Download selected items:
  - Queue all selected as separate jobs
  - Concurrency: respect user setting (1–5 parallel)
  - Per-item progress bars
  - Overall progress (X of N complete)
  - Individual item retry on failure

═══════════════════════════════════════
PART 6 — UI LAYOUT & COMPONENTS
═══════════════════════════════════════

6.1 — Single Page Layout

[HEADER — fixed top, blur backdrop]
  Left: Logo (SVG inline)
  Center: nothing (clean)
  Right: Search icon | Theme toggle | Settings | About | GitHub link

[HERO ZONE — centered, 40vh min-height]
  H1: "Download anything." (large, gradient text)
  Subheadline: "Paste a link from YouTube, TikTok, Instagram & more."
  
  URL INPUT — large, pill shape, full-width max 680px:
    Left: auto-detected platform icon (animated in)
    Center: text input
    Right: Clear button (×) | Paste button (clipboard icon) | Download button
    
  Below input: platform badge chips (scroll horizontally on mobile)
  Supported: YouTube · TikTok · Instagram · Reddit · X · Vimeo · SoundCloud · Facebook · Pinterest · Twitch · 1000+ more (yt-dlp)

[PREVIEW PANEL — slides in below hero, pushes content down]
  Left column (40%): thumbnail + metadata
  Right column (60%): quality/format selector + download CTA
  Mobile: stacked vertical

[BROWSER PANEL — below preview, collapsible]
  Search bar (separate from URL input)
  Tabs: [Trending] [Search results] [History]
  Grid of media cards (auto-fit, min 200px)

[DOWNLOAD QUEUE — fixed bottom bar, slides up when active]
  Collapsed: shows active count badge on bottom bar
  Expanded: list of jobs with progress bars

[SETTINGS MODAL — fullscreen overlay, slide up]
[ABOUT MODAL — fullscreen overlay, slide up]

6.2 — URL Input Behaviors

- On focus: border pulses with accent color
- On paste (Ctrl+V or clipboard): immediate icon detection animation
- While detecting: spinner in platform icon slot
- Platform detected: icon slides in from left with spring
- Invalid URL: red border + shake animation + error toast
- Valid URL: green border pulse → auto-fetch metadata
- Escape key: clear input + hide preview
- Enter key: submit / start download

6.3 — Theme System

Themes: dark (default), light, system
CSS custom properties for all colors.
Transition: 200ms ease on all color properties.
Accent color presets: Purple (#7C3AED), Blue (#2563EB), Teal (#0D9488),
  Rose (#E11D48), Orange (#EA580C), Green (#16A34A), custom hex input.
Saved to: localStorage via Zustand persist.

═══════════════════════════════════════
PART 7 — DOWNLOAD WORKFLOW
═══════════════════════════════════════

State machine:
IDLE → VALIDATING → FETCHING_METADATA → READY
→ [user clicks download]
→ QUEUED → PROCESSING → DOWNLOADING → COMPLETED
              ↓ (on error)
            FAILED → RETRYING → PROCESSING (up to maxRetries)
                              → FAILED_PERMANENT

Status messages (shown in UI):
  VALIDATING:       "Checking the link..."
  FETCHING_METADATA:"Fetching media info..."
  READY:            "Ready to download!"
  QUEUED:           "Waiting in queue... (position N)"
  PROCESSING:       "Processing your media..."
  DOWNLOADING:      "Downloading... X% · Xmb/s · Xs left"
  COMPLETED:        "Done! Saved to your downloads."
  FAILED:           "Something went wrong. [Retry]"
  RETRYING:         "Retrying... (attempt N of M)"

Progress tracking:
- SSE endpoint: GET /api/jobs/:jobId/progress
- Events: { type: 'progress', percent: 0-100, speed: 'Xmb/s', eta: Xs }
- Events: { type: 'complete', downloadUrl: '/api/download/:jobId' }
- Events: { type: 'error', code: 'ERROR_CODE', message: 'human message' }
- Client auto-reconnects on SSE disconnect (exponential backoff)

Download delivery:
- Server streams file directly to browser
- Headers: Content-Disposition: attachment; filename="..."
- Temp file deleted 10 minutes after first download
- Re-download: history stores jobId, server checks if file still exists

═══════════════════════════════════════
PART 8 — PLATFORM ADAPTER SYSTEM
═══════════════════════════════════════

Abstract interface: MediaAdapter
{
  name: string
  domains: string[]
  supports: ('video'|'audio'|'playlist'|'live'|'image')[]
  
  validate(url: string): boolean
  extractId(url: string): string | null
  fetchMetadata(url: string): Promise
  getFormats(url: string): Promise
  getStreamUrls(url: string, format: MediaFormat): Promise
  search?(query: string, options: SearchOptions): Promise
  fetchPlaylist?(url: string): Promise
  fetchChannel?(channelId: string): Promise
}

Adapter registry: Map
Platform detection: check URL hostname against each adapter's domains[]
Fallback: GenericAdapter (wraps yt-dlp JSON output)

Implement these adapters:

1. YouTubeAdapter
   - Metadata: yt-dlp --dump-json (spawned process)
   - Search: YouTube Data API v3 (if key) else Invidious API
   - Playlist: yt-dlp --flat-playlist --dump-json
   - Formats: parsed from yt-dlp format list

2. TikTokAdapter
   - Metadata + download: yt-dlp
   - Watermark removal: use no-watermark API endpoint

3. InstagramAdapter
   - yt-dlp for reels/videos
   - Handle stories, posts, reels

4. TwitterXAdapter
   - yt-dlp for video tweets
   - Handle spaces (audio)

5. RedditAdapter
   - Reddit JSON API (append .json to post URL)
   - yt-dlp for video extraction

6. VimeoAdapter
   - oEmbed API for metadata
   - yt-dlp for download

7. SoundCloudAdapter
   - SoundCloud API for metadata/search
   - yt-dlp for download

8. FacebookAdapter
   - yt-dlp only

9. PinterestAdapter
   - yt-dlp only

10. TwitchAdapter
    - Twitch API for metadata/clips/VODs
    - Streamlink or yt-dlp for live

11. GenericAdapter (FALLBACK)
    - yt-dlp --dump-json for any URL
    - Supports 1000+ sites automatically
    - Use when no specific adapter matches

═══════════════════════════════════════
PART 9 — MEDIA PROCESSING PIPELINE
═══════════════════════════════════════

Triggered per job in in-memory p-queue:

Step 1: URL validation + SSRF check (synchronous)
Step 2: Platform adapter selection
Step 3: Metadata fetch (with LRU cache check first)
Step 4: Format negotiation (user preference vs available)
Step 5: yt-dlp spawn:
  yt-dlp \
    --format "{format_id}" \
    --output "{TEMP_DIR}/{jobId}.%(ext)s" \
    --no-playlist \
    --geo-bypass \
    --no-check-certificates \
    --embed-metadata \
    --embed-thumbnail \
    --progress \
    "{url}"
Step 6: ffmpeg post-processing (if needed):
  - Audio extraction: -vn -acodec {codec} -ab {bitrate}
  - Format conversion: video mux or audio transcode
  - Metadata embedding: -metadata title="{title}" -metadata artist="{author}"
  - Thumbnail embedding (audio): -i cover.jpg -map 0 -map 1 -c copy
Step 7: Output file ready → emit 'complete' SSE event
Step 8: Schedule deletion: setTimeout(deleteFile, 10 * 60 * 1000)

Quality options:
  Video: best, 2160p, 1080p, 720p, 480p, 360p
  Audio: best, mp3-320, mp3-192, mp3-128, wav, aac, flac, opus

yt-dlp format strings:
  best video:     "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
  1080p:          "bestvideo[height<=1080][ext=mp4]+bestaudio/best[height<=1080]"
  720p:           "bestvideo[height<=720][ext=mp4]+bestaudio/best[height<=720]"
  audio only:     "bestaudio/best"

═══════════════════════════════════════
PART 10 — IN-MEMORY QUEUE SYSTEM
═══════════════════════════════════════

Library: p-queue (npm)
NO Redis. NO BullMQ. In-memory only.

Implementation:
```typescript
import PQueue from 'p-queue';

const metadataQueue = new PQueue({ concurrency: 10 });
const downloadQueue = new PQueue({ concurrency: 3 });
const cleanupQueue = new PQueue({ concurrency: 1 });

const jobs = new Map();

interface JobState {
  id: string;
  url: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  outputPath?: string;
  createdAt: Date;
  clients: Set; // SSE clients
}
```

Job lifecycle:
- Create job: generate UUID, add to jobs Map, add to queue
- On start: update status → 'processing', broadcast via SSE
- On progress: update progress 0-100, broadcast via SSE
- On complete: update status → 'completed', set outputPath, broadcast
- On error: update status → 'failed', set error, broadcast
- Auto-cleanup: remove from Map after 10 minutes

SSE broadcast:
```typescript
function broadcast(jobId: string, event: JobEvent) {
  const job = jobs.get(jobId);
  if (!job) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  job.clients.forEach(res => res.write(data));
}
```

═══════════════════════════════════════
PART 11 — API ROUTES (Express)
═══════════════════════════════════════

All routes prefixed: /api

POST /api/analyze
  Body: { url: string }
  Rate limit: 30/min per IP (in-memory store)
  Returns: MediaMetadata | Error
  Cache: check LRU cache first, fetch if miss

POST /api/download
  Body: { url: string, format: string, quality: string, audioOnly: boolean }
  Rate limit: 10/min per IP (in-memory store)
  Returns: { jobId: string }
  Side effect: enqueues download job

GET /api/jobs/:jobId/progress
  SSE stream
  Rate limit: 60/min per IP
  Registers client in job.clients Set
  Sends: progress events until complete/failed
  Cleanup: remove client from Set on disconnect

GET /api/download/:jobId
  Rate limit: 5/min per IP
  Check: file exists at outputPath
  Returns: file stream with Content-Disposition header
  After: schedule deletion if not already scheduled

POST /api/search
  Body: { query: string, platform: 'youtube'|'soundcloud'|'all', region: string }
  Rate limit: 60/min per IP (in-memory)
  Returns: SearchResult[]
  Cache: LRU cache, TTL 5 minutes

GET /api/trending
  Rate limit: 30/min per IP
  Returns: TrendingResult[]
  Cache: LRU cache, TTL 30 minutes

GET /api/health
  Returns: { status: 'ok', uptime: number, queueSize: number, cacheSize: number }

GET /api/platforms
  Returns: list of supported platform names + capabilities (static data)

═══════════════════════════════════════
PART 12 — SECURITY (SSRF + HEADERS)
═══════════════════════════════════════

SSRF Protection (server-side, CRITICAL):
Block all private/internal IP ranges before making ANY outbound request:
- 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10
- 127.0.0.0/8, 169.254.0.0/16
- 172.16.0.0/12, 192.0.0.0/24, 192.168.0.0/16
- 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24, 240.0.0.0/4
- AWS: 169.254.169.254
- GCP: metadata.google.internal

Implementation:
```typescript
import { isPrivateIp } from 'is-ip'; // or implement manually
function validateUrl(url: string): void {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  if (isPrivateIp(hostname) || isLocalhost(hostname)) {
    throw new Error('SSRF_BLOCKED');
  }
}
```

Helmet.js config (all headers):
- Content-Security-Policy: strict
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- HSTS: max-age=31536000; includeSubDomains

Rate limiting (express-rate-limit, in-memory — no Redis):
```typescript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // default in-memory store — no Redis needed
});
```

Input validation (all user inputs):
- URL: must parse as valid URL, must be http/https only
- format/quality: whitelist of allowed values only
- query: max 200 chars, strip special chars
- jobId: UUID format only (regex validate)

═══════════════════════════════════════
PART 13 — ERROR HANDLING
═══════════════════════════════════════

Server error codes + user messages:
INVALID_URL          → "That doesn't look like a valid URL."
SSRF_BLOCKED         → "That URL isn't allowed."
UNSUPPORTED_PLATFORM → "This site isn't supported yet."
PRIVATE_CONTENT      → "This content is private or age-restricted."
GEO_BLOCKED          → "This content isn't available in your region."
IS_LIVE_STREAM       → "This is a live stream — use live recording mode."
PLAYLIST_DETECTED    → "This is a playlist — select items to download."
RATE_LIMITED         → "Too many requests. Wait a moment and try again."
PROCESSING_FAILED    → "Processing failed. Retrying automatically..."
NETWORK_ERROR        → "Connection problem. Check your internet."
TIMEOUT              → "Request timed out. The server might be busy."
FILE_TOO_LARGE       → "This file exceeds the 2GB size limit."
YTDLP_ERROR         → "Could not extract media from this URL."
FFMPEG_ERROR        → "Media processing failed. Try a different format."

Frontend toast system:
- Types: success | error | warning | info
- Duration: success 3s, error 6s, warning 5s, info 4s
- Position: top-right (desktop), top-center (mobile)
- Stack max 3 toasts
- Dismiss on click
- Animated: slide in from right, fade out
- ARIA: role="alert" aria-live="assertive" for errors

═══════════════════════════════════════
PART 14 — DOWNLOAD HISTORY (IndexedDB)
═══════════════════════════════════════

Library: Dexie.js (no other DB library)

Schema:
```typescript
import Dexie, { Table } from 'dexie';

interface DownloadRecord {
  id?: number;
  url: string;
  platform: string;
  title: string;
  thumbnail: string;
  author: string;
  duration: number;
  format: string;
  quality: string;
  fileSize: number;
  downloadedAt: Date;
  status: 'completed' | 'failed';
}

class NexLoadDB extends Dexie {
  downloads!: Table;
  constructor() {
    super('nexload_db');
    this.version(1).stores({
      downloads: '++id, platform, downloadedAt, status'
    });
  }
}
```

History service:
- add(record): auto-prune to 500 max (delete oldest by downloadedAt)
- getAll(filters): filter by platform, status, date range
- search(query): filter by title containing query
- delete(id): remove single record
- clear(): remove all records
- exportCSV(): generate CSV blob for download
- exportJSON(): generate JSON blob for download

History UI (tab in browser panel):
- Card grid, same layout as search results
- Filter chips: All | YouTube | TikTok | etc.
- Sort: Newest | Oldest
- Search bar (local filter, no network call)
- Each card: thumbnail, title, platform badge, date, format badge, re-download button, delete button
- Empty state: illustration + "Your download history will appear here"
- Export buttons: CSV, JSON

═══════════════════════════════════════
PART 15 — SETTINGS PANEL
═══════════════════════════════════════

Modal overlay, organized in sections:

APPEARANCE
  Theme: Dark / Light / System (segmented control)
  Accent color: 8 color swatches + custom hex input

VIDEO
  Default quality: Best / 4K / 1080p / 720p / 480p / 360p (radio group)
  Prefer HDR: toggle
  Include subtitles: toggle + language selector (dropdown)
  Download thumbnail: toggle

AUDIO
  Default format: MP3 / WAV / AAC / FLAC / Opus (radio group)
  MP3 bitrate: 128 / 192 / 320 kbps (radio group, visible only if MP3 selected)
  Embed metadata: toggle
  Embed cover art: toggle

DOWNLOADS
  Auto-download (skip preview): toggle
  Concurrent downloads: 1–5 (slider)
  Filename template: text input
    Variables: {title} {author} {date} {quality} {format} {platform}
    Live preview of example filename below input

SEARCH & BROWSING
  YouTube API key: password input (stored in localStorage, displayed as *)
  Default region: dropdown (US, GB, IN, BD, etc.)
  SafeSearch: toggle
  Show trending on open: toggle

ADVANCED
  Custom API endpoint: text input (default: http://localhost:3001)
  Proxy URL: text input (optional, format: socks5://host:port)
  Request timeout: 5–60s (slider)
  Max retries: 1–5 (slider)
  Debug logging: toggle

DANGER ZONE (red section)
  Clear download history: button (with confirmation dialog)
  Reset all settings: button (with confirmation dialog)

Footer: "All data stored locally. Nothing sent to our servers."

═══════════════════════════════════════
PART 16 — ABOUT MODAL
═══════════════════════════════════════

Tabbed modal with sections:

About: mission statement, why we built NexLoad, open source philosophy
Features: visual feature grid with Lucide icons
Platforms: card grid, each platform with logo, name, supported formats
Privacy: "We collect nothing" — detailed breakdown of zero tracking
FAQ: accordion, 15+ questions covering common use cases
Keyboard Shortcuts: table of all keyboard shortcuts
API Reference: REST API docs for self-hosted users (Markdown-rendered)
Changelog: semantic versioning history (v1.0.0 → current)
Credits: yt-dlp, ffmpeg, open source dependencies + links

═══════════════════════════════════════
PART 17 — ANIMATIONS (Framer Motion)
═══════════════════════════════════════

Principles: purpose-driven, never decorative. Respect prefers-reduced-motion.

Specific animations:
  URL input focus: border color transition 150ms
  Platform icon: opacity 0→1 + x -10→0, spring stiffness 300 damping 25
  Preview panel: y 20→0 + opacity 0→1, spring stiffness 200 damping 30
  Metadata fields: stagger 0.05s per field, y 10→0 + opacity 0→1
  Download button click: scale 0.97, 100ms, spring
  Progress bar: width transition, spring stiffness 100 damping 20
  Toast: x 100→0 + opacity, ease-out 200ms; exit: x 100 + opacity, ease-in 150ms
  Error shake: keyframes x [0, -8, 8, -6, 6, -3, 3, 0], 400ms
  Settings modal: y 20→0 + opacity, backdrop fade 200ms
  Theme switch: CSS transition 200ms ease on all color props
  Live badge: opacity pulse 1→0.5→1, 1.5s infinite

Reduced motion:
  All animations → instant (duration: 0) when prefers-reduced-motion: reduce

═══════════════════════════════════════
PART 18 — ACCESSIBILITY
═══════════════════════════════════════

- WCAG 2.1 AA minimum
- Skip-to-content link (first focusable element)
- Logical tab order throughout
- Focus trap in modals (focus-trap-react)
- All interactive elements: visible focus indicator (2px outline, offset 2px)
- ARIA labels on icon-only buttons
- ARIA live region for download status (aria-live="polite")
- ARIA alert for errors (aria-live="assertive")
- Progress bar: role="progressbar" aria-valuenow aria-valuemin aria-valuemax
- Images: meaningful alt text or alt="" for decorative
- Form inputs:  associated via htmlFor
- Color contrast: minimum 4.5:1 for normal text, 3:1 for large text
- Error messages: linked to input via aria-describedby
- Modals: aria-modal="true", aria-labelledby pointing to modal title
- Reduced motion: all animations respect prefers-reduced-motion

═══════════════════════════════════════
PART 19 — PERFORMANCE TARGETS
═══════════════════════════════════════

Lighthouse targets: Performance 95+, Accessibility 95+, Best Practices 95+, SEO 90+

Techniques:
  Code splitting: React.lazy for Settings, About, History modals
  Image optimization: loading="lazy", decoding="async", srcset with AVIF/WebP
  Virtual scrolling: TanStack Virtual for search results > 50 items
  Debounce: URL analysis trigger debounced 300ms
  Memoization: React.memo on card components, useMemo for filtered lists
  Bundle analysis: vite-bundle-analyzer, target < 200KB gzipped
  Preconnect:  to API origin in index.html
  Font: system font stack (no external font load)
  Icons: Lucide (tree-shakeable, import individually)
  CSS: PurgeCSS via Tailwind (unused classes removed)

═══════════════════════════════════════
PART 20 — FOLDER STRUCTURE
═══════════════════════════════════════

nexload/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/            # Button, Input, Modal, Toast, Badge, Progress
│   │   │   │   ├── layout/        # Header, Footer
│   │   │   │   └── icons/         # Platform SVG icons
│   │   │   ├── features/
│   │   │   │   ├── downloader/    # URL input, preview panel, download button
│   │   │   │   ├── browser/       # Search, trending, history tabs
│   │   │   │   ├── queue/         # Download queue drawer
│   │   │   │   ├── settings/      # Settings modal
│   │   │   │   └── about/         # About modal
│   │   │   ├── hooks/
│   │   │   │   ├── useDownload.ts
│   │   │   │   ├── useMetadata.ts
│   │   │   │   ├── useSearch.ts
│   │   │   │   ├── useSSE.ts
│   │   │   │   └── useClipboard.ts
│   │   │   ├── stores/
│   │   │   │   ├── settingsStore.ts   # Zustand + persist → localStorage
│   │   │   │   ├── downloadStore.ts   # Zustand (no persist)
│   │   │   │   └── uiStore.ts         # Zustand (no persist)
│   │   │   ├── lib/
│   │   │   │   ├── api.ts             # API client (fetch wrapper)
│   │   │   │   ├── db.ts              # Dexie.js IndexedDB instance
│   │   │   │   ├── history.ts         # History service
│   │   │   │   └── utils.ts           # Helpers
│   │   │   ├── types/
│   │   │   │   └── index.ts           # All shared TypeScript types
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── public/
│   │   │   └── favicon.svg
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   └── server/
│       ├── src/
│       │   ├── adapters/
│       │   │   ├── base.ts            # MediaAdapter interface
│       │   │   ├── registry.ts        # Adapter registration
│       │   │   ├── youtube.ts
│       │   │   ├── tiktok.ts
│       │   │   ├── instagram.ts
│       │   │   ├── twitter.ts
│       │   │   ├── reddit.ts
│       │   │   ├── vimeo.ts
│       │   │   ├── soundcloud.ts
│       │   │   ├── facebook.ts
│       │   │   ├── twitch.ts
│       │   │   └── generic.ts         # yt-dlp fallback
│       │   ├── api/
│       │   │   ├── analyze.ts
│       │   │   ├── download.ts
│       │   │   ├── progress.ts        # SSE endpoint
│       │   │   ├── search.ts
│       │   │   ├── trending.ts
│       │   │   └── health.ts
│       │   ├── middleware/
│       │   │   ├── rateLimit.ts       # in-memory rate limiting
│       │   │   ├── validate.ts        # Joi validation
│       │   │   ├── ssrf.ts            # SSRF protection
│       │   │   └── errorHandler.ts
│       │   ├── services/
│       │   │   ├── queue.ts           # p-queue instance + job Map
│       │   │   ├── cache.ts           # LRU cache instance
│       │   │   ├── ytdlp.ts           # yt-dlp subprocess wrapper
│       │   │   ├── ffmpeg.ts          # ffmpeg processing
│       │   │   └── cleanup.ts         # temp file cleanup
│       │   ├── types/
│       │   │   └── index.ts
│       │   ├── app.ts                 # Express app setup
│       │   └── index.ts              # Entry point
│       └── tsconfig.json
├── docker-compose.yml                 # web + server only (no DB)
├── Dockerfile.web
├── Dockerfile.server
├── nginx.conf
├── .env.example
├── .github/workflows/ci.yml
└── README.md

═══════════════════════════════════════
PART 21 — DOCKER (NO DATABASE CONTAINERS)
═══════════════════════════════════════

docker-compose.yml — ONLY these services:
  nexload-web:    Nginx serving built React app
  nexload-server: Node.js API server

NO postgres container.
NO redis container.
NO mongo container.
NO any database container.

Dockerfile.server (multi-stage):
Stage 1 — builder: node:20-alpine, install deps, compile TS
Stage 2 — runtime: node:20-alpine
  RUN apk add --no-cache ffmpeg python3 py3-pip
  RUN pip3 install yt-dlp
  COPY --from=builder /app/dist .
  USER node (non-root)
  HEALTHCHECK: curl /api/health

Dockerfile.web:
Stage 1 — builder: node:20-alpine, npm run build
Stage 2 — runtime: nginx:alpine
  COPY --from=builder /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf

nginx.conf:
  gzip on, brotli on
  /api/* → proxy_pass to nexload-server:3001
  / → serve index.html (SPA fallback)
  /api/jobs/*/progress → proxy_buffering off (SSE support)
  Cache-Control: immutable for /assets/*
  Cache-Control: no-cache for index.html

═══════════════════════════════════════
PART 22 — ENVIRONMENT VARIABLES
═══════════════════════════════════════

# .env.example — NO database variables

# Server
NODE_ENV=production
PORT=3001

# Optional: enables YouTube search (Invidious used if not set)
YOUTUBE_API_KEY=

# Optional: enables SoundCloud search
SOUNDCLOUD_CLIENT_ID=

# Optional: enables Twitch
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=

# Optional: enables Vimeo metadata
VIMEO_ACCESS_TOKEN=

# Security
CORS_ORIGINS=http://localhost:5173

# Rate limits (per minute per IP)
RATE_LIMIT_ANALYZE=30
RATE_LIMIT_DOWNLOAD=10
RATE_LIMIT_SEARCH=60

# Processing
FFMPEG_PATH=/usr/bin/ffmpeg
YTDLP_PATH=/usr/local/bin/yt-dlp
TEMP_DIR=/tmp/nexload
MAX_FILE_SIZE_GB=2
CLEANUP_INTERVAL_MINUTES=10

# Queue
MAX_CONCURRENT_DOWNLOADS=3
MAX_CONCURRENT_METADATA=10

# Cache (in-memory)
METADATA_CACHE_MAX=200
METADATA_CACHE_TTL_MINUTES=5
TRENDING_CACHE_TTL_MINUTES=30

═══════════════════════════════════════
PART 23 — PRE-DELIVERY CHECKLIST
═══════════════════════════════════════

Verify and fix ALL before outputting final code:

DATABASE:
□ grep -r "prisma\|mongoose\|typeorm\|drizzle\|knex\|sequelize" — must return nothing
□ grep -r "redis\|ioredis\|bull\|bullmq" — must return nothing
□ grep -r "supabase\|firebase\|pocketbase" — must return nothing
□ docker-compose.yml has no postgres/redis/mongo services
□ package.json has no database driver dependencies

AI:
□ grep -r "openai\|anthropic\|gemini\|langchain\|huggingface" — must return nothing
□ No AI API calls anywhere in codebase

CODE QUALITY:
□ TypeScript strict mode — npx tsc --noEmit returns zero errors
□ ESLint — zero warnings
□ No TODO/FIXME comments in final output
□ No console.log in production code (use Winston logger)
□ All async functions have try/catch
□ All environment variables documented in .env.example

SECURITY:
□ SSRF protection active on all outbound URL fetches
□ Rate limiting on all API routes
□ Helmet.js configured on Express app
□ No secrets in frontend bundle
□ Input validation on all API route bodies

ACCESSIBILITY:
□ All images have alt attributes
□ All form inputs have associated labels
□ Focus trap in modals
□ ARIA live regions for dynamic content
□ prefers-reduced-motion respected

FUNCTIONALITY:
□ URL paste → metadata fetch works
□ Download → file delivered works
□ SSE progress updates work
□ History saves to IndexedDB
□ Settings persist to localStorage
□ Theme toggle works (dark/light/system)
□ Search returns results
□ Mobile layout works at 320px
□ Keyboard navigation works throughout

DOCKER:
□ docker-compose up works with only web + server
□ yt-dlp and ffmpeg present in server image
□ Health check passes

═══════════════════════════════════════
OUTPUT FORMAT (FINAL)
═══════════════════════════════════════

Output the complete implementation in this order:

1. README.md
2. .env.example
3. docker-compose.yml
4. Dockerfile.web
5. Dockerfile.server
6. nginx.conf
7. .github/workflows/ci.yml
8. apps/server/ — every file, complete
9. apps/web/ — every file, complete
10. ARCHITECTURE.md

Rules for output:
- Every file COMPLETE. No truncation.
- No "// TODO" or "// implement this"
- No placeholder functions
- No "..." abbreviations
- If a file exceeds context, continue in next response
- Ask "continue?" after each major section