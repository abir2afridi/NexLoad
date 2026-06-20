/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import { X, Info, ShieldAlert, Terminal, Flame } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export const AboutModal: React.FC = () => {
  const { isAboutOpen, setAboutOpen } = useAppStore();
  const [activeSubTab, setActiveSubTab] = useState<"about" | "api" | "faq">("about");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  if (!isAboutOpen) return null;

  const faqs = [
    {
      q: "How does the Intelligence Engine recommend a quality ladder?",
      a: "When you supply a link, our intelligent layer predicts network packet density, content compression levels, and typical codec footprints. It then negotiates the optimal resolution (DASH streams or direct M3U8 container grids) to return immediately.",
    },
    {
      q: "Are credentials or browser history logged?",
      a: "No. NexLoad is fully decentralized. Download histories are stored inside IndexedDB locally on your machine and never synced to external analytics trackers.",
    },
    {
      q: "What is the maximum output media size?",
      a: "By default, our Node.js container limits file transfers to 2GB per extraction cycle to prevent high packet loss and process timeouts.",
    },
    {
      q: "Can I selectively download playlists?",
      a: "Yes. Our platform-aware adapter detects playlist/collection lists, lets you select checkboxes per track item, and calculates total filesizes before starting.",
    },
    {
      q: "Can I record Live Streams?",
      a: "Yes. If the channel is detected as live, NexLoad displays a pulsing live indicator and triggers segment-based recording streams up to 10 minutes.",
    },
  ];

  return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/60 animate-fade-in"
        id="about-modal-backdrop"
        onClick={() => setAboutOpen(false)}
      >
        <div
          className="w-full max-w-2xl card-brutalist bg-cream flex flex-col max-h-[90vh]"
          id="about-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-sand">
            <div className="flex items-center gap-3">
              <BrandLogo size={22} />
              <h3 className="text-sm font-bold text-ink">
                About NexLoad
              </h3>
            </div>
            <button
              onClick={() => setAboutOpen(false)}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="tab-underline-wrapper px-6 gap-6 py-2.5">
            <div className="flex gap-6">
              {(["about", "api", "faq"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={`tab-underline-item ${
                    activeSubTab === tab ? "active" : ""
                  }`}
                >
                  {tab === "about"
                    ? "Mission & Architecture"
                    : tab === "api"
                      ? "API Docs"
                      : "Interactive FAQ"}
                </button>
              ))}
            </div>
          </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-sm">
          {activeSubTab === "about" && (
            <div className="flex flex-col gap-5">
              <div className="text-center py-4">
                <BrandLogo size={48} className="mx-auto mb-3" />
                <h4 className="text-base font-bold text-ink">
                  NexLoad Media Engine
                </h4>
                <p className="text-[10px] text-ink-muted mt-1">
                  Version 1.2.0 &bull; MIT Open Source
                </p>
              </div>

              <div className="card-brutalist-static p-5">
                <h5 className="text-[10px] tracking-[0.25em] text-amber uppercase mb-2 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5" />
                  The Cobalt UX Philosophy
                </h5>
                <p className="text-xs text-ink-light leading-relaxed">
                  NexLoad is built entirely from scratch with zero-friction
                  architecture. There are no tracking scripts, cookie compliance
                  pop-ups, telemetry logs, or intrusive advertisements. You
                  paste a resource URL, select your quality, and immediate
                  extraction triggers. Full stop.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card-brutalist-static p-4">
                  <h5 className="text-[10px] tracking-wider text-ink-light uppercase mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber" />
                    Decentralized Privacy
                  </h5>
                  <p className="text-[11px] text-ink-light leading-relaxed">
                    All downloaded index tokens and user history items are held
                    solely within IndexedDB inside your browser shell.
                  </p>
                </div>
                <div className="card-brutalist-static p-4">
                  <h5 className="text-[10px] tracking-wider text-ink-light uppercase mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber" />
                    Intelligence Recommendation
                  </h5>
                  <p className="text-[11px] text-ink-light leading-relaxed">
                    Utilizes deep LLM parsing rules to analyze platform links,
                    extracting beautiful metadata details with high fidelity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "api" && (
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] tracking-[0.25em] text-amber uppercase flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                Self-Hosted REST Endpoints
              </h4>
              <p className="text-xs text-ink-light leading-relaxed">
                Developers can dispatch automated extraction scripts directly
                from external shells using our unified API routes:
              </p>

              <div className="flex flex-col gap-3">
                <div className="card-brutalist-static p-4 text-xs">
                  <div className="flex items-center gap-2 mb-2 text-green text-[10px] uppercase tracking-wider">
                    <span className="bg-green/10 border border-green/25 px-2 py-0.5">
                      POST
                    </span>
                    <span className="text-ink-light">/api/analyze-url</span>
                  </div>
                  <pre className="text-ink-muted text-[9px] bg-ink/[0.02] border border-sand/30 p-3 mt-2 overflow-x-auto custom-scrollbar leading-relaxed">
{`curl -X POST http://localhost:3000/api/analyze-url \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'`}
                  </pre>
                </div>

                <div className="card-brutalist-static p-4 text-xs">
                  <div className="flex items-center gap-2 mb-2 text-amber text-[10px] uppercase tracking-wider">
                    <span className="bg-amber/10 border border-amber/25 px-2 py-0.5">
                      POST
                    </span>
                    <span className="text-ink-light">/api/jobs/create</span>
                  </div>
                  <pre className="text-ink-muted text-[9px] bg-ink/[0.02] border border-sand/30 p-3 mt-2 overflow-x-auto custom-scrollbar leading-relaxed">
{`curl -X POST http://localhost:3000/api/jobs/create \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://...","title":"Rickroll","formatId":"best_mp4"}'`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "faq" && (
            <div className="flex flex-col gap-2">
              {faqs.map((f, idx) => {
                const isExpanded = expandedFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="card-brutalist-static"
                  >
                    <button
                      onClick={() =>
                        setExpandedFaqIndex(isExpanded ? null : idx)
                      }
                      className={`w-full text-left px-5 py-3.5 flex items-center justify-between text-[10px] tracking-wider uppercase text-ink-light hover:text-ink transition-colors cursor-pointer ${
                        isExpanded ? "border-b border-sand" : ""
                      }`}
                    >
                      <span className="max-w-[85%]">{f.q}</span>
                      <svg
                        className={`w-3.5 h-3.5 text-ink-muted transition-transform duration-300 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-2 text-xs text-ink-light leading-relaxed">
                        {f.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-sand">
          <button
            onClick={() => setAboutOpen(false)}
            className="px-5 py-2 bg-amber hover:bg-ink text-white text-xs tracking-[0.15em] uppercase transition-all cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
