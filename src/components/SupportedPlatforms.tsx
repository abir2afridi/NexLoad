/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Youtube, Music, Instagram, Video, Tv, Twitter, MessageSquare, Image, Globe } from "lucide-react";

interface SupportedPlatformsProps {
  currentUrl: string;
}

interface PlatformConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  pattern: RegExp;
}

const PLATFORMS: PlatformConfig[] = [
  { name: "YouTube", icon: Youtube, color: "text-red-500 border-red-500/40", pattern: /(youtube\.com|youtu\.be)/i },
  { name: "TikTok", icon: Video, color: "text-ink border-ink/30", pattern: /tiktok\.com/i },
  { name: "Instagram", icon: Instagram, color: "text-pink-500 border-pink-500/40", pattern: /instagram\.com/i },
  { name: "SoundCloud", icon: Music, color: "text-orange-500 border-orange-500/40", pattern: /soundcloud\.com/i },
  { name: "Twitch", icon: Tv, color: "text-purple-500 border-purple-500/40", pattern: /twitch\.tv/i },
  { name: "Twitter/X", icon: Twitter, color: "text-sky-500 border-sky-500/40", pattern: /(twitter\.com|x\.com)/i },
  { name: "Reddit", icon: MessageSquare, color: "text-orange-600 border-orange-600/40", pattern: /reddit\.com/i },
  { name: "Pinterest", icon: Image, color: "text-rose-500 border-rose-500/40", pattern: /pinterest\.com/i },
  { name: "Vimeo", icon: Globe, color: "text-blue-400 border-blue-400/40", pattern: /vimeo\.com/i },
];

export const SupportedPlatforms: React.FC<SupportedPlatformsProps> = ({ currentUrl }) => {
  const detectActive = (pattern: RegExp) => {
    if (!currentUrl) return false;
    return pattern.test(currentUrl);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full" id="supported-platforms-container">
      <span className="label-meta">Engine Compatibility</span>
      <div className="flex flex-wrap justify-center gap-px max-w-xl">
        {PLATFORMS.map((plat) => {
          const isActive = detectActive(plat.pattern);
          const Icon = plat.icon;
          return (
            <div
              key={plat.name}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono tracking-wider uppercase border transition-all cursor-default ${
                isActive
                  ? `${plat.color} bg-ink/5`
                  : "text-ink-muted border-ink/5 hover:text-ink-light hover:border-ink/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{plat.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
