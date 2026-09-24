"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, ExternalLink, Save, Loader2 } from "lucide-react";
import { WebsitePreviewModal } from "./WebsitePreviewModal";

interface WebsitePageHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg?: string;
  previewPath: string; // e.g. "/about", "/academics"
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  isFormSubmit?: boolean;
  extraActions?: React.ReactNode;
}

export function WebsitePageHeader({
  title,
  subtitle,
  icon,
  iconBg = "bg-primary/10 border-primary/20 text-primary",
  previewPath,
  onSave,
  saving = false,
  saveLabel = "Save Changes",
  isFormSubmit = false,
  extraActions,
}: WebsitePageHeaderProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // Compute live URL for the direct link
  const getDirectUrl = () => {
    if (typeof window === "undefined") return previewPath;
    const searchParams = new URLSearchParams(window.location.search);
    const subdomain = searchParams.get("subdomain");
    let finalPath = previewPath.startsWith("/") ? previewPath : `/${previewPath}`;
    if (subdomain && !finalPath.includes("subdomain=")) {
      const sep = finalPath.includes("?") ? "&" : "?";
      finalPath = `${finalPath}${sep}subdomain=${encodeURIComponent(subdomain)}`;
    }
    return finalPath;
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        {/* Left: Back Link & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/website"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors border border-slate-200/60 dark:border-slate-800"
            title="Back to Website Manager"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}
          >
            {icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[12px]">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {extraActions}

          {/* Preview Modal Button */}
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[13px] font-semibold transition-all shadow-sm hover:shadow"
            title={`Preview ${title} in modal`}
          >
            <Eye className="w-4 h-4 text-primary" />
            <span>Preview</span>
          </button>

          {/* Open in New Tab Button */}
          <a
            href={getDirectUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow"
            title={`Open live ${previewPath} page in new tab`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Save Button */}
          {isFormSubmit ? (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm hover:shadow"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : saveLabel}
            </button>
          ) : onSave ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm hover:shadow"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : saveLabel}
            </button>
          ) : null}
        </div>
      </div>

      {/* Responsive Live Preview Modal */}
      <WebsitePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        path={previewPath}
        title={`Live Preview: ${title}`}
      />
    </>
  );
}
