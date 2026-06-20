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
  { name: "YouTube", icon: Youtube, color: "text-red-400 border-red-500/30", pattern: /(youtube\.com|youtu\.be)/i },
  { name: "TikTok", icon: Video, color: "text-white border-white/20", pattern: /tiktok\.com/i },
  { name: "Instagram", icon: Instagram, color: "text-pink-400 border-pink-500/30", pattern: /instagram\.com/i },
  { name: "SoundCloud", icon: Music, color: "text-orange-400 border-orange-500/30", pattern: /soundcloud\.com/i },
  { name: "Twitch", icon: Tv, color: "text-purple-400 border-purple-500/30", pattern: /twitch\.tv/i },
  { name: "Twitter/X", icon: Twitter, color: "text-sky-400 border-sky-500/30", pattern: /(twitter\.com|x\.com)/i },
  { name: "Reddit", icon: MessageSquare, color: "text-orange-500 border-orange-600/30", pattern: /reddit\.com/i },
  { name: "Pinterest", icon: Image, color: "text-rose-500 border-rose-600/30", pattern: /pinterest\.com/i },
  { name: "Vimeo", icon: Globe, color: "text-blue-400 border-blue-400/30", pattern: /vimeo\.com/i },
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-display tracking-wider uppercase border transition-all cursor-default ${
                isActive
                  ? `${plat.color} bg-white/[0.03] border-current scale-105`
                  : "text-white/20 border-white/5 hover:text-white/40 hover:border-white/10"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{plat.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
