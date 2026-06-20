/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAppStore } from "../stores/useAppStore";
import { X, Info, HelpCircle, ShieldAlert, Terminal, MessageSquare, Flame } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-fade-in"
      id="about-modal-backdrop"
    >
      <div 
        className="w-full max-w-2xl glass-panel rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh]"
        id="about-modal-container"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-zinc-900 bg-zinc-950/20">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={24} />
            <h3 className="text-base font-extrabold text-white tracking-tight">About NexLoad</h3>
          </div>
          <button
            onClick={() => setAboutOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors focus:outline-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation bar */}
        <div className="flex border-b border-zinc-900 px-6 gap-6 text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase py-2.5 bg-zinc-950/10">
          <button
            onClick={() => setActiveSubTab("about")}
            className={`py-2 transition-colors cursor-pointer relative ${activeSubTab === "about" ? "text-brand-accent font-extrabold" : "hover:text-zinc-300"}`}
          >
            Mission & Architecture
            {activeSubTab === "about" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("api")}
            className={`py-2 transition-colors cursor-pointer relative ${activeSubTab === "api" ? "text-brand-accent font-extrabold" : "hover:text-zinc-300"}`}
          >
            API Docs
            {activeSubTab === "api" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("faq")}
            className={`py-2 transition-colors cursor-pointer relative ${activeSubTab === "faq" ? "text-brand-accent font-extrabold" : "hover:text-zinc-300"}`}
          >
            Interactive FAQ
            {activeSubTab === "faq" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-full" />
            )}
          </button>
        </div>

        {/* Scrollable Contents */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-zinc-300 text-sm">
          
          {activeSubTab === "about" && (
            <div className="flex flex-col gap-5">
              <div className="text-center py-4">
                <BrandLogo size={48} className="mx-auto mb-3" />
                <h4 className="text-lg font-black text-white">NexLoad Media Engine</h4>
                <p className="text-zinc-500 font-mono text-[10.5px] mt-1">Version 1.2.0 • MIT Open Source licensed</p>
              </div>

              <div className="p-5 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl shadow-inner relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none" />
                <h5 className="font-extrabold text-white mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-brand-accent animate-pulse">
                  <Flame className="w-4 h-4 text-brand-accent" /> The Cobalt UX Philosophy
                </h5>
                <p className="text-[12.5px] text-zinc-400 leading-relaxed font-sans mt-1">
                  NexLoad is built entirely from scratch with zero-friction architecture. There are no tracking scripts, cookie compliance pop-ups, telemetry logs, or intrusive advertisements. You paste a resource URL, select your quality, and immediate extraction triggers. Full stop.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4.5 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  <h5 className="font-bold text-zinc-200 mb-1 flex items-center gap-1.5 text-xs">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" /> Decentralized Privacy
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    All downloaded index tokens and user history items are held solely within IndexedDB inside your browser shell.
                  </p>
                </div>

                <div className="p-4.5 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-brand-accent/5 rounded-full blur-xl pointer-events-none" />
                  <h5 className="font-bold text-zinc-200 mb-1 flex items-center gap-1.5 text-xs">
                    <Info className="w-4 h-4 text-brand-accent" /> Intelligence recommendation
                  </h5>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Utilizes deep LLM parsing rules to analyze platform links, extracting beautiful metadata details with high fidelity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "api" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <h4 className="font-extrabold text-zinc-100 flex items-center gap-1.5 font-mono uppercase text-[11px] tracking-wider text-brand-accent">
                <Terminal className="w-4 h-4 text-brand-accent" /> Self-Hosted REST endpoints
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Developers can dispatch automated extraction scripts directly from external shells using our unified API routes:
              </p>

              <div className="flex flex-col gap-3.5">
                {/* Endpoint 1 */}
                <div className="bg-zinc-950/80 p-4.5 border border-zinc-900/80 rounded-2xl font-mono text-xs shadow-lg">
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold">
                    <span className="bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">POST</span>
                    <span>/api/analyze-url</span>
                  </div>
                  <pre className="text-zinc-400 text-[10px] bg-zinc-950 p-3 rounded-xl border border-zinc-900/80 mt-2.5 overflow-x-auto custom-scrollbar leading-relaxed">
{`curl -X POST http://localhost:3000/api/analyze-url \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'`}
                  </pre>
                </div>

                {/* Endpoint 2 */}
                <div className="bg-zinc-950/80 p-4.5 border border-zinc-900/80 rounded-2xl font-mono text-xs shadow-lg">
                  <div className="flex items-center gap-2 mb-2 text-brand-accent font-bold">
                    <span className="bg-brand-accent/10 border border-brand-accent/25 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">POST</span>
                    <span>/api/jobs/create</span>
                  </div>
                  <pre className="text-zinc-400 text-[10px] bg-zinc-950 p-3 rounded-xl border border-zinc-900/80 mt-2.5 overflow-x-auto custom-scrollbar leading-relaxed">
{`curl -X POST http://localhost:3000/api/jobs/create \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://...","title":"Rickroll","formatId":"best_mp4"}'`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "faq" && (
            <div className="flex flex-col gap-3 ml-0.5 animate-fade-in" id="faq-accordions">
              {faqs.map((f, idx) => {
                const isExpanded = expandedFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-zinc-900/60 rounded-2xl overflow-hidden bg-zinc-950/35 hover:bg-zinc-950/55 transition-all duration-300"
                  >
                    <button
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between font-bold text-[11px] font-mono uppercase tracking-wider text-zinc-100 hover:text-brand-accent transition-colors duration-250 focus:outline-none cursor-pointer"
                    >
                      <span className="max-w-[85%]">{f.q}</span>
                      <ChevronRightArrow rotating={isExpanded} />
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1.5 text-zinc-400 text-xs leading-relaxed border-t border-zinc-900/30 animate-slide-down font-sans">
                        {f.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-zinc-900 bg-zinc-950/20">
          <button
            onClick={() => setAboutOpen(false)}
            className="bg-brand-accent text-white hover:bg-opacity-95 text-xs px-6 py-2.5 rounded-xl font-bold font-mono uppercase tracking-wider cursor-pointer shadow-[0_4px_15px_rgba(124,58,237,0.15)] transition-all"
          >
            Acknowledge
          </button>
        </div>

      </div>
    </div>
  );
};

// Subtle icon chevron rotating component helper to avoid inline classes
const ChevronRightArrow: React.FC<{ rotating: boolean }> = ({ rotating }) => {
  return (
    <svg
      className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${rotating ? "rotate-90 text-brand-accent" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
    </svg>
  );
};
