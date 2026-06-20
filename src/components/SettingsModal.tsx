/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
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
} from "lucide-react";

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

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-accent", settings.accentColor);
    document.documentElement.style.setProperty("--font-brand-accent", settings.accentColor);
  }, [settings.accentColor]);

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
        <div className="flex justify-between items-center px-6 py-4 border-b border-sand">
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
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8 text-sm">
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
                <div className="flex gap-0 border border-sand w-fit">
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
                      className={`flex items-center gap-2 px-4 py-2 text-xs tracking-wider uppercase transition-all cursor-pointer ${
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
                      className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] tracking-wider uppercase transition-all cursor-pointer ${
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
        <div className="flex justify-between items-center px-6 py-4 border-t border-sand">
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
