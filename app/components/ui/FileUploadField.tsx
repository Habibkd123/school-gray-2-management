"use client";

import React, { useRef, useState } from "react";
import { Upload, Link2, X, Loader2, CheckCircle2, FileText, Image } from "lucide-react";
import { getAccessToken } from "@/lib/utils/session";

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string; // e.g. "image/*" or "application/pdf"
  placeholder?: string;
  hint?: string;
}

export function FileUploadField({
  label,
  value,
  onChange,
  accept = "image/*",
  placeholder = "https://...",
  hint,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"url" | "upload">("url");

  const isPdf = accept.includes("pdf");
  const isImage = accept.includes("image");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const json = await res.json();
      if (json.success) {
        onChange(json.url);
        setMode("url");
      } else {
        setError(json.message || "Upload failed");
      }
    } catch (err: any) {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = () => {
    onChange("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>

      {/* Mode toggle */}
      <div className="flex gap-1 p-0.5 bg-slate-800/60 rounded-lg border border-slate-700/50 w-fit mb-1">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            mode === "url" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Link2 className="w-3 h-3" /> URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            mode === "upload" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Upload className="w-3 h-3" /> Upload
        </button>
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <div className="flex gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
          />
          {value && (
            <button
              type="button"
              onClick={clear}
              className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors dark:text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${label.replace(/\s+/g, "-")}`}
          />
          <label
            htmlFor={`file-upload-${label.replace(/\s+/g, "-")}`}
            className={`flex items-center justify-center gap-3 w-full p-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
              uploading
                ? "border-primary/30 bg-primary/5 cursor-not-allowed"
                : "border-slate-600/50 hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-[13px] text-primary font-medium">Uploading...</span>
              </>
            ) : (
              <>
                {isPdf ? <FileText className="w-5 h-5 text-slate-400" /> : <Upload className="w-5 h-5 text-slate-400" />}
                <div className="text-center">
                  <p className="text-[13px] text-slate-300 font-medium">Click to upload</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
                    {hint || (isPdf ? "PDF up to 5MB" : "Images up to 5MB")}
                  </p>
                </div>
              </>
            )}
          </label>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-[11px] text-rose-400 mt-1">{error}</p>
      )}

      {/* Preview if value exists */}
      {value && (
        <div className="mt-2 flex items-center gap-2">
          {value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || (value.startsWith("/uploads/images") || (!isPdf && isImage)) ? (
            <div className="relative">
              <img
                src={value}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover border border-slate-700/50"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ) : value.match(/\.pdf$/i) || value.startsWith("/uploads/pdfs") ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <FileText className="w-4 h-4 text-amber-400" />
              <a href={value} target="_blank" rel="noreferrer" className="text-[12px] text-amber-400 hover:underline font-medium">
                View PDF
              </a>
            </div>
          ) : value ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-600/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-slate-300 truncate max-w-[200px]">{value}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={clear}
            className="p-1 text-slate-500 hover:text-rose-400 transition-colors dark:text-slate-400"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
