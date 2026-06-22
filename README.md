# NexLoad

**"Download anything. Instantly."**

A production-grade media & image downloader web application — minimal, fast, zero-friction. No tracking, no ads, no database, no AI.

---

## Quick Start

```bash
# Install dependencies
npm install

# Install yt-dlp (required for video downloads)
pip install yt-dlp

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Features

### Video Mode
- **Multi-platform** — YouTube, TikTok, Instagram, Reddit, SoundCloud, Vimeo, Twitch, Twitter/X, Pinterest, direct URLs (MP4, etc.)
- **Playlist support** — Batch download entire playlists with track selection
- **Real downloads** — Powered by yt-dlp with video+audio merge
- **Quality selection** — 4K, 1080p, 720p, 480p, Audio Only (MP3, FLAC, WAV, AAC, Opus)
- **Download queue** — Header dropdown with real-time progress, speed, and ETA
- **OG metadata fallback** — Extracts title & thumbnail from page HTML when yt-dlp fails (TikTok, Instagram, etc.)
- **Direct video download** — Bypasses yt-dlp for platforms that expose direct video URLs (Pinterest, etc.)
- **Search & Browse** — In-app trending and search across platforms

### Image Mode
- **Image grabber** — Paste any direct image URL (JPG, PNG, WebP, GIF, BMP, AVIF, SVG, TIFF)
- **Format conversion** — Convert between JPEG, PNG, WebP, AVIF, BMP on download
- **Quality control** — Adjustable quality slider (10–100%) with presets (Max, High, Med, Low, Tiny)
- **Image preview** — Instant preview with metadata (dimensions, format, file size)
- **Clipboard paste** — One-click paste from clipboard
- **Blob download** — Client-side blob download with auto-naming

### Shared
- **Download history** — Stored locally via IndexedDB (max 500 records)
- **Dark/Light themes** — Multiple dark modes + light mode + system preference
- **Accent colors** — 8 selectable accent colors
- **Privacy-first** — Zero analytics, zero fingerprinting, zero tracking
- **Responsive design** — Fully responsive across mobile, tablet, and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, TailwindCSS 4, Motion (Framer) |
| State | Zustand (persisted to localStorage) |
| Icons | Lucide React |
| Backend | Express 4, Node.js |
| Security | Helmet.js, express-rate-limit |
| Storage | IndexedDB via Dexie.js (browser), in-memory (server) |
| Video Downloads | yt-dlp (spawned subprocess), direct HTTP fallback |
| Image Processing | Optional sharp module for format conversion |

## Project Structure

```
NexLoad/
  server.ts              # Express backend (API + static serving)
  src/
    App.tsx              # Main app with header, queue dropdown, mode toggle
    types.ts             # TypeScript interfaces
    components/
      ImageDownloader.tsx    # Image mode — URL input, preview, format/quality
      MetadataPreview.tsx    # Preview panel with format/playlist selection
      SearchAndBrowse.tsx    # Trending/search/history tabs
      SupportedPlatforms.tsx # Platform icon grid
      SettingsModal.tsx      # App settings
      AboutModal.tsx         # About & FAQ
      GhostLoader.tsx        # Animated hero loader
      BrandLogo.tsx          # Logo component
    stores/
      useAppStore.ts         # Zustand store (appMode, jobs, settings)
    lib/
      db.ts                  # Dexie IndexedDB
  public/
    favicon.png          # Browser tab icon
    banner.png           # Social sharing OG image
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze-url` | Analyze a URL and return media metadata |
| POST | `/api/search` | Search across platforms |
| POST | `/api/jobs/create` | Create a download job |
| GET | `/api/jobs/:id` | Get job status |
| GET | `/api/download/:id` | Download the completed file |
| GET | `/api/platforms` | List supported platforms |
| POST | `/api/image/info` | Fetch image metadata (dimensions, type, size) |
| GET | `/api/image/download` | Download/convert image with optional format & quality |
| POST | `/api/cookies` | Upload YouTube cookies for bot detection bypass |
| GET | `/api/cookies` | Check cookies status |

## Browser Extension

The `extension/` folder contains a **NexLoad Cookie Exporter** browser extension (Chrome/Firefox).

YouTube blocks downloads from cloud server IPs. This extension exports your browser cookies so NexLoad can bypass bot detection.

### Install (Development)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Extension icon appears in toolbar

### Usage

1. Log into YouTube in your browser
2. Click the NexLoad extension icon
3. Click **Export cookies.txt** to download
4. Go to NexLoad → **Settings** → **YouTube Cookies** → **Upload**
5. Or click **Upload to NexLoad** for one-click upload (if NexLoad tab is open)

### Features

- One-click YouTube cookie export (Netscape format)
- Direct upload to NexLoad when tab is open
- Shows cookie status (active/expired)
- Explains why cookies are needed

## Design

- **Typography** — Chakra Petch font family
- **Colors** — Warm cream (#FAF8F4) + burnt orange (#D2691E) + ink dark
- **Corners** — Sharp 0px border-radius (editorial poster aesthetic)
- **Animations** — Purposeful motion via Framer Motion, respects `prefers-reduced-motion`
- **Open Graph** — Social sharing card via `banner.png`

## Requirements

- Node.js 18+
- Python 3.10+ (for yt-dlp)
- yt-dlp (`pip install yt-dlp`)
- ffmpeg (optional, required for >720p YouTube downloads)
- sharp (optional, required for image format conversion)

## License

MIT
