# NexLoad

**"Download anything. Instantly."**

A production-grade media downloader web application — minimal, fast, zero-friction. No tracking, no ads, no database, no AI.

---

## Quick Start

```bash
# Install dependencies
npm install

# Install yt-dlp (required for downloads)
pip install yt-dlp

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Features

- **Multi-platform** — YouTube, TikTok, Instagram, Reddit, SoundCloud, Vimeo, Twitch, Twitter/X, Pinterest
- **Playlist support** — Batch download entire playlists with track selection
- **Real downloads** — Powered by yt-dlp with video+audio merge
- **Quality selection** — 4K, 1080p, 720p, 480p, Audio Only (MP3, FLAC, WAV, AAC, Opus)
- **Download queue** — Track progress with real-time speed and ETA
- **Search & Browse** — In-app trending and search across platforms
- **Download history** — Stored locally via IndexedDB (max 500 records)
- **Dark/Light themes** — Multiple dark modes + light mode + system preference
- **Accent colors** — 8 selectable accent colors
- **Privacy-first** — Zero analytics, zero fingerprinting, zero tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6, TailwindCSS 4, Motion (Framer) |
| State | Zustand (persisted to localStorage) |
| Icons | Lucide React |
| Backend | Express 4, Node.js |
| Security | Helmet.js, express-rate-limit |
| Storage | IndexedDB via Dexie.js (browser), in-memory (server) |
| Downloads | yt-dlp (spawned subprocess) |

## Project Structure

```
NexLoad/
  server.ts              # Express backend (API + static serving)
  src/
    App.tsx              # Main React app
    types.ts             # TypeScript interfaces
    components/
      MetadataPreview.tsx    # Preview panel with format/playlist selection
      SearchAndBrowse.tsx    # Trending/search/history tabs
      QueueDrawer.tsx        # Download queue with progress
      SettingsModal.tsx      # App settings
      GhostLoader.tsx        # Animated hero loader
      BrandLogo.tsx          # Logo component
    stores/
      useAppStore.ts         # Zustand store
    lib/
      db.ts                  # Dexie IndexedDB
  docs/
    plan.md               # Full project specification
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze-url` | Analyze a URL and return metadata |
| POST | `/api/search` | Search across platforms |
| POST | `/api/jobs/create` | Create a download job |
| GET | `/api/jobs/:id` | Get job status |
| GET | `/api/jobs/:id/progress` | SSE progress stream |
| GET | `/api/download/:id` | Download the completed file |
| GET | `/api/platforms` | List supported platforms |

## Design

- **Typography** — Chakra Petch font family
- **Colors** — Warm cream (#FAF8F4) + burnt orange (#D2691E) + ink dark
- **Corners** — Sharp 0px border-radius (editorial poster aesthetic)
- **Animations** — Purposeful motion via Framer Motion, respects `prefers-reduced-motion`

## Requirements

- Node.js 18+
- Python 3.10+ (for yt-dlp)
- yt-dlp (`pip install yt-dlp`)

## License

MIT
