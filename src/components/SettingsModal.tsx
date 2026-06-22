/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import {
  X,
  RefreshCw,
  Eye,
  Shield,
  HardDrive,
  Moon,
  Sun,
  Monitor,
  Terminal,
  Cookie,
  Check,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "../lib/api";

const ACCENT_PRESETS = [
  { name: "Editorial Blue", value: "#2563EB" },
  { name: "Neon Cyan", value: "#00e5ff" },
  { name: "Laser Red", value: "#ef4444" },
  { name: "Volt Green", value: "#22c55e" },
  { name: "Royal Purple", value: "#7c3aed" },
  { name: "Magenta Shock", value: "#d946ef" },
  { name: "Amber Glow", value: "#f59e0b" },
  { name: "Slate Titanium", value: "#71717a" },
];

export const SettingsModal: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetSettings,
    isSettingsOpen,
    setSettingsOpen,
    themeMode,
    setThemeMode,
  } = useAppStore();

  const [cookiesActive, setCookiesActive] = useState(false);
  const [cookiesUploading, setCookiesUploading] = useState(false);
  const [cookiesMessage, setCookiesMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-accent", settings.accentColor);
    document.documentElement.style.setProperty("--font-brand-accent", settings.accentColor);
  }, [settings.accentColor]);

  useEffect(() => {
    apiFetch("/api/cookies").then(r => r.json()).then(d => setCookiesActive(d.active)).catch(() => {});
  }, []);

  const handleUploadCookies = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCookiesUploading(true);
      setCookiesMessage(null);
      try {
        const text = await file.text();
        const res = await apiFetch("/api/cookies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookies: text }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCookiesActive(true);
        setCookiesMessage("Cookies uploaded! YouTube downloads enabled.");
      } catch (err: any) {
        setCookiesMessage(err.message);
      } finally {
        setCookiesUploading(false);
      }
    };
    input.click();
  };

  if (!isSettingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 animate-fade-in"
      id="settings-modal-backdrop"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="w-full max-w-2xl card-brutalist bg-cream flex flex-col max-h-[90vh]"
        id="settings-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-sand">
          <h3 className="text-sm font-bold text-ink">
            Supercharger Settings
          </h3>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 sm:gap-8 text-sm">
          {/* Appearance */}
          <div className="flex flex-col gap-4">
            <h4 className="label-meta flex items-center gap-2">
              <Eye className="w-3 h-3 text-amber" />
              Appearance
            </h4>
            <div className="card-brutalist-static p-5 flex flex-col gap-5">
              {/* Theme */}
              <div>
                <span className="label-meta block mb-3">
                  Theme Mode
                </span>
                <div className="flex gap-0 border border-sand w-fit flex-wrap">
                  {[
                    { mode: "dark" as const, icon: Moon, label: "Dark" },
                    { mode: "dark2" as const, icon: Terminal, label: "Dark 2" },
                    { mode: "light" as const, icon: Sun, label: "Light" },
                    { mode: "system" as const, icon: Monitor, label: "System" },
                  ].map(({ mode, icon: Icon, label }, idx) => {
                    const isNotLast = idx !== 3;
                    return (
                    <button
                      key={mode}
                      onClick={() => setThemeMode(mode)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 text-[10px] sm:text-xs tracking-wider uppercase transition-all cursor-pointer ${
                        themeMode === mode
                          ? "bg-amber text-white"
                          : "bg-transparent text-ink-muted hover:text-ink hover:bg-ink/5"
                      } ${isNotLast ? "border-r border-sand" : ""}`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent */}
              <div>
                <span className="label-meta block mb-3">
                  Accent Color
                </span>
                <div className="flex flex-wrap gap-1">
                  {ACCENT_PRESETS.map((col) => (
                    <button
                      key={col.value}
                      onClick={() => updateSettings({ accentColor: col.value })}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 border text-[9px] sm:text-[10px] tracking-wider uppercase transition-all cursor-pointer ${
                        settings.accentColor === col.value
                          ? "border-amber bg-amber/10 text-ink"
                          : "border-sand text-ink-muted hover:text-ink-light hover:border-sand-medium"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5"
                        style={{ backgroundColor: col.value }}
                      />
                      {col.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2.5 mt-3">
                  <span className="label-meta">Hex</span>
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) =>
                      updateSettings({ accentColor: e.target.value })
                    }
                    className="bg-transparent border border-sand px-3 py-1 text-xs text-ink-light focus:border-amber focus:outline-none w-28 uppercase transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audio & Video */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <h4 className="label-meta">Media Transcoding Presets</h4>
                <div className="card-brutalist-static p-4 flex flex-col gap-4">
                <div>
                  <label className="label-meta block mb-2">
                    Quality
                  </label>
                  <select
                    value={settings.defaultQuality}
                    onChange={(e: any) =>
                      updateSettings({ defaultQuality: e.target.value })
                    }
                    className="w-full bg-cream-dark border border-sand px-3 py-2 text-xs text-ink-light focus:border-amber focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="best">Best (Maximum Available)</option>
                    <option value="2160p">4K (2160p HDR)</option>
                    <option value="1080p">Full HD (1080p 60fps)</option>
                    <option value="720p">HD (720p 30fps)</option>
                    <option value="audio">Audio Only</option>
                  </select>
                </div>
                <div>
                  <label className="label-meta block mb-2">
                    Audio Format
                  </label>
                  <select
                    value={settings.defaultAudioFormat}
                    onChange={(e: any) =>
                      updateSettings({ defaultAudioFormat: e.target.value })
                    }
                    className="w-full bg-cream-dark border border-sand px-3 py-2 text-xs text-ink-light focus:border-amber focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="mp3">MPEG-3 (.mp3)</option>
                    <option value="wav">Lossless Wave (.wav)</option>
                    <option value="aac">Advanced Audio (.aac)</option>
                    <option value="flac">FLAC Audio (.flac)</option>
                    <option value="opus">Opus Voice (.opus)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="label-meta">Advanced Pipeline</h4>
              <div className="card-brutalist-static p-4 flex flex-col gap-3">
                {[
                  {
                    label: "Force AV1 Codec",
                    desc: "Saves network data blocks",
                    key: "preferAv1" as const,
                  },
                  {
                    label: "Audio Normalizer",
                    desc: "Locks frequencies to EBU R128",
                    key: "normalizeAudio" as const,
                  },
                  {
                    label: "Auto-Download",
                    desc: "Bypasses secondary review screens",
                    key: "autoDownload" as const,
                  },
                ].map(({ label, desc, key }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div>
                      <div className="text-xs text-ink-light">
                        {label}
                      </div>
                      <div className="text-[9px] text-ink-muted">
                        {desc}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={(settings as any)[key]}
                      onChange={(e) =>
                        updateSettings({ [key]: e.target.checked } as any)
                      }
                      className="w-3.5 h-3.5 accent-amber cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filename & Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <h4 className="label-meta flex items-center gap-2">
                <HardDrive className="w-3 h-3 text-amber" />
                Naming Formats
              </h4>
              <div className="card-brutalist-static p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-ink-muted uppercase tracking-wider">
                  <span>Tags:</span>
                  <code className="px-1 py-0.5 bg-parchment border border-sand text-amber">
                    {"{title}"}
                  </code>
                  <code className="px-1 py-0.5 bg-parchment border border-sand text-amber">
                    {"{quality}"}
                  </code>
                  <code className="px-1 py-0.5 bg-parchment border border-sand text-amber">
                    {"{date}"}
                  </code>
                </div>
                <input
                  type="text"
                  value={settings.filenameTemplate}
                  onChange={(e) =>
                    updateSettings({ filenameTemplate: e.target.value })
                  }
                  className="bg-cream-dark border border-sand px-3 py-2 text-xs text-ink-light focus:border-amber focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="label-meta flex items-center gap-2">
                <Cookie className="w-3 h-3 text-amber" />
                YouTube Cookies
              </h4>
              <div className="card-brutalist-static p-4 flex flex-col gap-4">
                {/* Status */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-xs text-ink-light flex items-center gap-2">
                      {cookiesActive ? (
                        <><Check className="w-3 h-3 text-emerald-500" /> Cookies Active</>
                      ) : (
                        <><AlertTriangle className="w-3 h-3 text-amber" /> No Cookies</>
                      )}
                    </div>
                    <div className="text-[9px] text-ink-muted">
                      {cookiesActive
                        ? "YouTube downloads enabled"
                        : "Upload cookies.txt to enable YouTube downloads"}
                    </div>
                  </div>
                  <button
                    onClick={handleUploadCookies}
                    disabled={cookiesUploading}
                    className="px-3 py-1.5 text-[10px] border border-sand hover:border-amber text-ink-muted hover:text-amber transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
                  >
                    {cookiesUploading ? "Uploading..." : "Upload"}
                  </button>
                </div>

                {cookiesMessage && (
                  <div className={`text-[10px] ${cookiesMessage.includes("!") ? "text-red" : "text-emerald-600"}`}>
                    {cookiesMessage}
                  </div>
                )}

                {/* Why Section */}
                <div className="border-t border-sand pt-3">
                  <h5 className="text-[10px] font-bold text-ink/70 uppercase tracking-wider mb-2">Why are cookies needed?</h5>
                  <p className="text-[10px] text-ink-muted leading-relaxed">
                    YouTube actively blocks downloads from cloud servers (AWS, Render, Vercel, etc.)
                    by flagging their IP addresses as bots. Without cookies, YouTube returns a
                    <span className="text-amber font-mono"> "Sign in to confirm you're not a bot" </span>
                    error. Cookies prove to YouTube that the request comes from a real browser session,
                    bypassing this restriction.
                  </p>
                </div>

                {/* How to Generate */}
                <div className="border-t border-sand pt-3">
                  <h5 className="text-[10px] font-bold text-ink/70 uppercase tracking-wider mb-2">How to generate cookies.txt</h5>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-bold text-amber bg-amber/10 px-1.5 py-0.5 border border-amber/20 shrink-0 mt-0.5">1</span>
                      <p className="text-[10px] text-ink-muted leading-relaxed">
                        <strong className="text-ink/70">Open your browser</strong> and make sure you are
                        <strong className="text-ink/70"> logged into YouTube</strong> (a Google account).
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-bold text-amber bg-amber/10 px-1.5 py-0.5 border border-amber/20 shrink-0 mt-0.5">2</span>
                      <div className="text-[10px] text-ink-muted leading-relaxed">
                        <strong className="text-ink/70">Run this command</strong> in your terminal:
                        <div className="mt-1.5 p-2 bg-ink/5 border border-sand font-mono text-[9px] text-amber break-all">
                          yt-dlp --cookies-from-browser chrome --cookies cookies.txt "https://www.youtube.com"
                        </div>
                        <p className="mt-1 text-ink-muted">
                          Replace <code className="text-amber">chrome</code> with
                          <code className="text-amber"> firefox</code>,
                          <code className="text-amber"> edge</code>, or
                          <code className="text-amber"> brave</code> depending on your browser.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-bold text-amber bg-amber/10 px-1.5 py-0.5 border border-amber/20 shrink-0 mt-0.5">3</span>
                      <p className="text-[10px] text-ink-muted leading-relaxed">
                        A <strong className="text-ink/70">cookies.txt</strong> file will be created in your current directory.
                        Click <strong className="text-amber">Upload</strong> above and select this file.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="border-t border-sand pt-3">
                  <h5 className="text-[10px] font-bold text-ink/70 uppercase tracking-wider mb-2">Important notes</h5>
                  <ul className="flex flex-col gap-1.5">
                    <li className="flex items-start gap-2 text-[10px] text-ink-muted leading-relaxed">
                      <span className="text-amber shrink-0">•</span>
                      <span>Cookies <strong className="text-ink/70">expire after ~30 days</strong>. When YouTube downloads stop working, regenerate and re-upload.</span>
                    </li>
                    <li className="flex items-start gap-2 text-[10px] text-ink-muted leading-relaxed">
                      <span className="text-amber shrink-0">•</span>
                      <span>You <strong className="text-ink/70">must be logged into YouTube</strong> in the browser before running the command.</span>
                    </li>
                    <li className="flex items-start gap-2 text-[10px] text-ink-muted leading-relaxed">
                      <span className="text-amber shrink-0">•</span>
                      <span>Uploaded cookies are stored <strong className="text-ink/70">temporarily</strong> on the server. They are lost when the server restarts — you'll need to re-upload.</span>
                    </li>
                    <li className="flex items-start gap-2 text-[10px] text-ink-muted leading-relaxed">
                      <span className="text-amber shrink-0">•</span>
                      <span><strong className="text-ink/70">Non-YouTube platforms</strong> (TikTok, Instagram, etc.) work without cookies.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="label-meta flex items-center gap-2">
                <Shield className="w-3 h-3 text-amber" />
                Search Privacy
              </h4>
              <div className="card-brutalist-static p-4 flex flex-col gap-3 min-h-[82px] justify-center">
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="text-xs text-ink-light">
                      Strict SafeSearch
                    </div>
                    <div className="text-[9px] text-ink-muted">
                      Filters unsafe tags
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.safeSearch}
                    onChange={(e) =>
                      updateSettings({ safeSearch: e.target.checked })
                    }
                    className="w-3.5 h-3.5 accent-amber cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-t border-sand">
          <button
            onClick={resetSettings}
            className="text-[10px] tracking-wider text-ink-muted hover:text-ink uppercase transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Defaults
          </button>
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-5 py-2 bg-amber hover:bg-ink text-white text-xs tracking-[0.15em] uppercase transition-all cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
