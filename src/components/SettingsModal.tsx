/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";
import { X, Sliders, RefreshCw, Eye, Shield, HardDrive, Info } from "lucide-react";

const ACCENT_PRESETS = [
  { name: "Royal Purple", value: "#7C3AED" },
  { name: "Sleek Mint", value: "#10B981" },
  { name: "Electric Blue", value: "#3B82F6" },
  { name: "Tangerine", value: "#F97316" },
  { name: "Crimson Red", value: "#EF4444" },
  { name: "Hot Magenta", value: "#D946EF" },
  { name: "Cyberpunk Yellow", value: "#F59E0B" },
  { name: "Cobalt Slate", value: "#4B5563" },
];

export const SettingsModal: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetSettings,
    isSettingsOpen,
    setSettingsOpen,
  } = useAppStore();

  // Dynamic CSS injector for the custom accent color variable (Part 5.4 system)
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-accent", settings.accentColor);
    document.documentElement.style.setProperty("--font-brand-accent", settings.accentColor);
  }, [settings.accentColor]);

  if (!isSettingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-fade-in"
      id="settings-modal-backdrop"
    >
      <div 
        className="w-full max-w-2xl glass-panel rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh]"
        id="settings-modal-container"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-zinc-900 bg-zinc-950/20">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-brand-accent animate-pulse" />
            <h3 className="text-base font-extrabold text-white tracking-tight">Supercharger Settings</h3>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors focus:outline-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal scrolling contents */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-sm">
          
          {/* Section 1: Appearance & Branding (Accent selector) */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-brand-accent" /> Dynamic Visual Accents
            </h4>
            <div className="p-5 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl shadow-inner">
              <span className="text-xs text-zinc-400 block mb-3.5 font-mono">
                Select predefined brand palettes or type a custom Hex color value:
              </span>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_PRESETS.map((col) => (
                  <button
                    key={col.value}
                    onClick={() => updateSettings({ accentColor: col.value })}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium transition-all duration-300 transform hover:scale-[1.03] cursor-pointer ${
                      settings.accentColor === col.value
                        ? "bg-brand-accent/20 border-brand-accent text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                        : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-805"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-2 ring-black/40"
                      style={{ backgroundColor: col.value }}
                    />
                    {col.name}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2.5 mt-4 max-w-xs">
                <span className="text-xs font-mono text-zinc-500 font-semibold">Hex Code:</span>
                <input
                  type="text"
                  value={settings.accentColor}
                  onChange={(e) => updateSettings({ accentColor: e.target.value })}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 focus:outline-none w-32 uppercase transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Audio & Video Defaults */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Media Transcoding Presets
              </h4>
              <div className="p-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl flex flex-col gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-2 font-mono">Default Extractor Quality:</label>
                  <select
                    value={settings.defaultQuality}
                    onChange={(e: any) => updateSettings({ defaultQuality: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:border-brand-accent focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="best">Best (Maximum Available)</option>
                    <option value="2160p">4K (2160p HDR)</option>
                    <option value="1080p">Full HD (1080p 60fps)</option>
                    <option value="720p">HD (720p 30fps)</option>
                    <option value="audio">Audio Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-2 font-mono">Audio Format Container:</label>
                  <select
                    value={settings.defaultAudioFormat}
                    onChange={(e: any) => updateSettings({ defaultAudioFormat: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:border-brand-accent focus:outline-none transition-all cursor-pointer"
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

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Advanced Transmox Pipeline
              </h4>
              <div className="p-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Force AV1 Codec</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Saves network data blocks</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.preferAv1}
                    onChange={(e) => updateSettings({ preferAv1: e.target.checked })}
                    className="w-4 h-4 text-brand-accent focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Audio Volume Normalizer</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Locks frequencies to EBU R128</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.normalizeAudio}
                    onChange={(e) => updateSettings({ normalizeAudio: e.target.checked })}
                    className="w-4 h-4 text-brand-accent focus:ring-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Direct Auto-Download</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Bypasses secondary review screens</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoDownload}
                    onChange={(e) => updateSettings({ autoDownload: e.target.checked })}
                    className="w-4 h-4 text-brand-accent focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Filename structure & Search region */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-brand-accent" /> Naming Formats
              </h4>
              <div className="p-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] font-mono text-zinc-400">
                  <span>Available tags:</span>
                  <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-semibold text-brand-accent">{"{title}"}</code>
                  <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-semibold text-brand-accent">{"{quality}"}</code>
                  <code className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-semibold text-brand-accent">{"{date}"}</code>
                </div>
                <input
                  type="text"
                  value={settings.filenameTemplate}
                  onChange={(e) => updateSettings({ filenameTemplate: e.target.value })}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 focus:outline-none w-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand-accent" /> Search Privacy
              </h4>
              <div className="p-4 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl flex flex-col gap-3 min-h-[82px] justify-center">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Strict SafeSearch</div>
                    <div className="text-[10px] text-zinc-500 font-mono">Filters unsafe tags</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.safeSearch}
                    onChange={(e) => updateSettings({ safeSearch: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-accent focus:ring-1 focus:ring-brand-accent/30 bg-zinc-900 border-zinc-800 cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-zinc-900 bg-zinc-900/5">
          <button
            onClick={resetSettings}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 uppercase font-bold focus:outline-none flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-pulse" /> Reset Defaults
          </button>
          <button
            onClick={() => setSettingsOpen(false)}
            className="bg-brand-accent text-white hover:bg-opacity-90 px-5 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer"
          >
            Save configurations
          </button>
        </div>

      </div>
    </div>
  );
};
