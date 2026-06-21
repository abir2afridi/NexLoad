/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { addHistoryRecord } from "../lib/db";
import {
  Image,
  Globe,
  Clipboard,
  X,
  Download,
  Loader,
  Check,
} from "lucide-react";
import { motion } from "motion/react";

interface ImageInfo {
  url: string;
  originalUrl: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  previewUrl: string;
}

const FORMAT_OPTIONS = [
  { ext: "original", label: "Original" },
  { ext: "jpg", label: "JPEG" },
  { ext: "png", label: "PNG" },
  { ext: "webp", label: "WebP" },
  { ext: "avif", label: "AVIF" },
  { ext: "bmp", label: "BMP" },
];

const QUALITY_PRESETS = [
  { value: 100, label: "Max" },
  { value: 90, label: "High" },
  { value: 75, label: "Med" },
  { value: 60, label: "Low" },
  { value: 40, label: "Tiny" },
];

export const ImageDownloader: React.FC = () => {
  const [urlInput, setUrlInput] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState("original");
  const [selectedQuality, setSelectedQuality] = useState(90);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        setError(null);
      }
    } catch {
      alert("Unable to access clipboard. Paste manually.");
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsFetching(true);
    setError(null);
    setImageInfo(null);
    setDownloadSuccess(false);

    try {
      const res = await fetch("/api/image/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch image info.");
      setImageInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleDownload = async () => {
    if (!imageInfo) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const params = new URLSearchParams({
        url: imageInfo.originalUrl,
        format: selectedFormat,
        quality: String(selectedQuality),
      });

      const res = await fetch(`/api/image/download?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Download failed.");
      }

      const blob = await res.blob();
      const ext = selectedFormat === "original"
        ? imageInfo.contentType.split("/")[1]?.split(";")[0] || "png"
        : selectedFormat;
      const filename = `${imageInfo.filename}.${ext}`;

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      await addHistoryRecord({
        id: `img_${Date.now()}`,
        url: imageInfo.originalUrl,
        platform: "image",
        title: filename,
        thumbnail: imageInfo.previewUrl,
        author: "Direct Download",
        durationLabel: "N/A",
        format: ext,
        quality: `${imageInfo.width}x${imageInfo.height}`,
        fileSizeLabel: formatBytes(imageInfo.sizeBytes),
        date: Date.now(),
        status: "completed",
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* ─── URL INPUT ─── */}
      <form
        onSubmit={handleAnalyze}
        className={`card-brutalist flex flex-col sm:flex-row transition-all duration-300 ${
          error ? "border-red/50" : "focus-within:border-amber"
        }`}
      >
        <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b sm:border-b-0 sm:border-r border-sand">
          <Globe className="w-4 h-4 text-amber shrink-0" />
          <input
            type="text"
            placeholder="Paste any image URL (JPG, PNG, WebP, GIF, BMP...)"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setError(null); }}
            className="w-full bg-transparent border-none text-sm text-ink/80 placeholder-ink-subtle/60 focus:outline-none focus:ring-0 leading-normal"
          />
          {urlInput && (
            <button
              type="button"
              onClick={() => { setUrlInput(""); setError(null); setImageInfo(null); }}
              className="p-1 text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handlePaste}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-3.5 bg-ink/5 border-r border-sand hover:bg-ink/10 text-ink-light hover:text-ink transition-all cursor-pointer flex items-center justify-center"
          >
            <Clipboard className="w-3.5 h-3.5" />
          </button>
          <button
            type="submit"
            disabled={isFetching || !urlInput.trim()}
            className="flex-1 sm:flex-none px-6 sm:px-8 py-3 sm:py-3.5 bg-amber hover:bg-ink text-white text-xs tracking-[0.15em] uppercase transition-all cursor-pointer disabled:bg-ink/10 disabled:text-ink-muted disabled:cursor-not-allowed"
          >
            {isFetching ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader className="w-3 h-3 animate-spin" />
                Analyzing
              </span>
            ) : "Analyze"}
          </button>
        </div>
      </form>

      {/* ─── ERROR ─── */}
      {error && (
        <div className="card-brutalist p-4 flex items-start gap-3 text-xs border-red/30">
          <span className="text-red font-bold text-[10px] tracking-[0.2em] uppercase bg-red/10 px-2 py-1 border border-red/20 shrink-0">
            Error
          </span>
          <p className="leading-relaxed text-ink/70">{error}</p>
        </div>
      )}

      {/* ─── IMAGE RESULT ─── */}
      {imageInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className=""
        >
          <div className="card-brutalist bg-cream overflow-hidden">
            {/* Preview + Info */}
            <div className="flex flex-col md:flex-row">
              {/* Image Preview */}
              <div className="md:w-1/2 bg-ink/[0.02] border-b md:border-b-0 md:border-r border-sand overflow-hidden">
                <img
                  src={imageInfo.previewUrl}
                  alt={imageInfo.filename}
                  className="w-full h-auto max-h-[400px] object-contain"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Info Panel */}
              <div className="md:w-1/2 p-4 sm:p-5 flex flex-col gap-3">
                <div>
                  <span className="text-[9px] tracking-[0.25em] text-amber uppercase block mb-1">
                    Image Detected
                  </span>
                  <h3 className="text-base font-bold text-ink leading-tight break-all">
                    {imageInfo.filename}
                  </h3>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Format", value: imageInfo.contentType.split("/")[1]?.toUpperCase() || "?" },
                    { label: "Size", value: formatBytes(imageInfo.sizeBytes) },
                    { label: "Width", value: imageInfo.width ? `${imageInfo.width}px` : "N/A" },
                    { label: "Height", value: imageInfo.height ? `${imageInfo.height}px` : "N/A" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-ink/[0.03] p-2.5 border border-sand">
                      <div className="text-[8px] text-ink-muted uppercase tracking-wider">{label}</div>
                      <div className="text-[11px] font-bold text-ink/80 font-mono mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Source */}
                <div className="bg-ink/[0.02] p-2.5 border border-sand">
                  <div className="text-[8px] text-ink-muted uppercase tracking-wider mb-1">Source</div>
                  <p className="text-[10px] text-ink/50 break-all font-mono leading-relaxed">{imageInfo.originalUrl}</p>
                </div>
              </div>
            </div>

            {/* ─── OPTIONS BAR ─── */}
            <div className="border-t border-sand p-4 sm:p-5 flex flex-col gap-4">
              {/* Format Selection */}
              <div>
                <span className="label-meta text-[10px] block mb-2">Output Format</span>
                <div className="flex flex-wrap gap-1.5">
                  {FORMAT_OPTIONS.map((fmt) => {
                    const isActive = selectedFormat === fmt.ext;
                    return (
                      <button
                        key={fmt.ext}
                        onClick={() => setSelectedFormat(fmt.ext)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] border transition-all cursor-pointer ${
                          isActive
                            ? "bg-amber/10 border-amber text-ink ring-1 ring-amber"
                            : "bg-cream border-sand text-ink-muted hover:border-ink/20"
                        }`}
                      >
                        {isActive && <Check className="w-2.5 h-2.5 text-amber" />}
                        <span className="font-mono uppercase tracking-wider">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quality Slider */}
              {selectedFormat !== "original" && selectedFormat !== "bmp" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-meta text-[10px]">Quality</span>
                    <span className="text-[10px] font-mono text-amber font-bold">{selectedQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(Number(e.target.value))}
                    className="w-full h-1.5 bg-ink/10 appearance-none cursor-pointer accent-amber"
                  />
                  <div className="flex justify-between mt-1.5">
                    {QUALITY_PRESETS.map((q) => (
                      <button
                        key={q.value}
                        onClick={() => setSelectedQuality(q.value)}
                        className={`text-[8px] uppercase tracking-wider cursor-pointer transition-colors ${
                          selectedQuality === q.value ? "text-amber font-bold" : "text-ink-muted hover:text-ink-light"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full bg-amber hover:bg-ink text-white text-sm tracking-[0.15em] uppercase py-3 flex items-center justify-center gap-2 transition-all disabled:bg-ink/10 disabled:text-ink-muted disabled:cursor-not-allowed cursor-pointer"
              >
                {isDownloading ? (
                  <><Loader className="w-4 h-4 animate-spin" /> Processing...</>
                ) : downloadSuccess ? (
                  <><Check className="w-4 h-4" /> Saved</>
                ) : (
                  <><Download className="w-4 h-4" /> Download Image</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── EMPTY STATE ─── */}
      {!imageInfo && !isFetching && !error && (
        <div className="card-brutalist-static p-8 sm:p-12 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-ink/10 flex items-center justify-center">
            <Image className="w-8 h-8 text-ink/15" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink/60 mb-1">Paste an image URL above</h3>
            <p className="text-[11px] text-ink-muted max-w-sm">
              Supports JPG, PNG, GIF, WebP, BMP, AVIF, SVG, TIFF and more.
              Convert between formats, adjust quality, and download instantly.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {["JPG", "PNG", "WebP", "GIF", "BMP", "AVIF", "SVG"].map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-ink-muted border border-ink/10"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
