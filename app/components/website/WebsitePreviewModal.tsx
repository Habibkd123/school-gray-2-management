"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  X, RotateCw, ExternalLink, Monitor, Tablet, Smartphone,
  Globe, Loader2, Sparkles
} from "lucide-react";

interface WebsitePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  path: string; // e.g. "/about", "/academics"
  title?: string;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

export function WebsitePreviewModal({
  isOpen,
  onClose,
  path,
  title = "Page Preview",
}: WebsitePreviewModalProps) {
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Resolve target URL with current subdomain if present
  const getFullUrl = () => {
    if (typeof window === "undefined") return path;
    const origin = window.location.origin;
    const searchParams = new URLSearchParams(window.location.search);
    const subdomain = searchParams.get("subdomain");

    let finalPath = path.startsWith("/") ? path : `/${path}`;
    if (subdomain && !finalPath.includes("subdomain=")) {
      const sep = finalPath.includes("?") ? "&" : "?";
      finalPath = `${finalPath}${sep}subdomain=${encodeURIComponent(subdomain)}`;
    }
    return `${origin}${finalPath}`;
  };

  const fullUrl = getFullUrl();

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  const getDeviceWidth = () => {
    switch (device) {
      case "mobile":
        return "max-w-[400px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "max-w-[1280px]";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white shrink-0 shadow-lg">
        {/* Left: Title & Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[14px] text-white truncate">
                {title}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" /> Live
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
              {fullUrl}
            </p>
          </div>
        </div>

        {/* Center: Device Switcher */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700/80 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              device === "desktop"
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
            title="Desktop View (Full Width)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice("tablet")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              device === "tablet"
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
              device === "mobile"
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
            title="Mobile View (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Mobile</span>
          </button>
        </div>

        {/* Right: Actions (Refresh, Open in New Tab, Close) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            title="Reload Preview"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>

          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new browser tab"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-[12px] font-semibold transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Tab</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            title="Close Preview (Esc)"
            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-all ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center">
        <div
          className={`w-full ${getDeviceWidth()} h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 relative`}
        >
          {/* Simulated Browser Chrome Bar for Desktop/Tablet */}
          <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="flex-1 max-w-md mx-auto bg-slate-950/80 border border-slate-800 rounded-md px-3 py-0.5 text-[11px] text-slate-400 truncate text-center font-mono">
              {fullUrl}
            </div>
            <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
              {device === "mobile" ? "390px" : device === "tablet" ? "768px" : "Responsive"}
            </div>
          </div>

          {/* Loading Indicator Overlay */}
          {loading && (
            <div className="absolute inset-0 top-9 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                Loading live preview...
              </p>
            </div>
          )}

          {/* The Actual Page Iframe */}
          <iframe
            key={refreshKey}
            ref={iframeRef}
            src={fullUrl}
            title={title}
            onLoad={() => setLoading(false)}
            className="w-full flex-1 border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
