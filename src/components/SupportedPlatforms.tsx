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
  {
    name: "YouTube",
    icon: Youtube,
    color: "bg-red-500/10 text-red-400 border-red-500/30",
    pattern: /(youtube\.com|youtu\.be)/i,
  },
  {
    name: "TikTok",
    icon: Video,
    color: "bg-zinc-800 text-zinc-100 border-zinc-600",
    pattern: /tiktok\.com/i,
  },
  {
    name: "Instagram",
    icon: Instagram,
    color: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    pattern: /instagram\.com/i,
  },
  {
    name: "SoundCloud",
    icon: Music,
    color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    pattern: /soundcloud\.com/i,
  },
  {
    name: "Twitch",
    icon: Tv,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    pattern: /twitch\.tv/i,
  },
  {
    name: "Twitter/X",
    icon: Twitter,
    color: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    pattern: /(twitter\.com|x\.com)/i,
  },
  {
    name: "Reddit",
    icon: MessageSquare,
    color: "bg-orange-600/10 text-orange-500 border-orange-600/30",
    pattern: /reddit\.com/i,
  },
  {
    name: "Pinterest",
    icon: Image,
    color: "bg-rose-600/10 text-rose-500 border-rose-600/30",
    pattern: /pinterest\.com/i,
  },
  {
    name: "Vimeo",
    icon: Globe,
    color: "bg-blue-400/10 text-blue-400 border-blue-400/30",
    pattern: /vimeo\.com/i,
  },
];

export const SupportedPlatforms: React.FC<SupportedPlatformsProps> = ({ currentUrl }) => {
  const detectActive = (pattern: RegExp) => {
    if (!currentUrl) return false;
    return pattern.test(currentUrl);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full" id="supported-platforms-container">
      <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">
        Engine Compatibility
      </span>
      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {PLATFORMS.map((plat) => {
          const isActive = detectActive(plat.pattern);
          const Icon = plat.icon;
          return (
            <div
              key={plat.name}
              id={`platform-chip-${plat.name.toLowerCase().replace("/", "-")}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 transform cursor-default ${
                isActive
                  ? `${plat.color} scale-105 ring-2 ring-brand-accent/40 shadow-[0_0_12px_rgba(124,58,237,0.3)]`
                  : "bg-zinc-900/40 text-zinc-400 border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200 hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{plat.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
