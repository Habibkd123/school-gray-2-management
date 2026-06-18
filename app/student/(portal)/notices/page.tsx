"use client";

import React, { useState } from "react";
import { useNotices, ApiNotice } from "../../../hooks/useNotices";
import {
  Megaphone,
  Calendar,
  Search,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
  Eye,
  X,
} from "lucide-react";

export default function StudentNoticesPage() {
  const { notices, loading } = useNotices();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotice, setSelectedNotice] = useState<ApiNotice | null>(null);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Filter notices for students
  // Target audience is either "all" or "students"
  const studentNotices = notices.filter((notice) => {
    const isForStudent =
      notice.target_audience === "all" || notice.target_audience === "students";
    const isPublished = notice.is_published;
    
    // Check if search query matches title or content
    const matchesSearch =
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchQuery.toLowerCase());

    return isForStudent && isPublished && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    if (expandedNoticeId === id) {
      setExpandedNoticeId(null);
    } else {
      setExpandedNoticeId(id);
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case "all":
        return "General";
      case "students":
        return "Students Only";
      default:
        return audience;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notice Board</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Important announcements, events and updates from the administration
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[13px] font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* ── Notice List / Grid ────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : studentNotices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-305 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-405">
            No active notices
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            There are no announcements currently published for you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studentNotices.map((notice) => {
            const isExpanded = expandedNoticeId === notice._id;
            const publishDate = new Date(notice.publish_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={notice._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {publishDate}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        notice.target_audience === "all"
                          ? "bg-slate-50 border border-slate-100 text-slate-605 dark:bg-slate-800/40 dark:border-slate-750 dark:text-slate-350"
                          : "bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400"
                      }`}
                    >
                      {getAudienceLabel(notice.target_audience)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-bold text-slate-905 dark:text-white leading-snug">
                    {notice.title}
                  </h3>

                  {/* Content (Truncated or Full) */}
                  <p
                    className={`text-[13px] text-slate-600 dark:text-slate-350 leading-relaxed font-medium ${
                      isExpanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {notice.content}
                  </p>
                </div>

                {/* Footer action buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-4 pt-4">
                  <div className="flex gap-2">
                    {notice.attachment_url && (
                      <a
                        href={notice.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Attachment
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedNotice(notice)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Modal
                    </button>
                  </div>

                  <button
                    onClick={() => toggleExpand(notice._id)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Notice Modal ───────────────────────────────────────────── */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-150 dark:border-slate-800/80">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {new Date(selectedNotice.publish_date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <button
                onClick={() => setSelectedNotice(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-405 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[60vh] scrollbar-thin">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  selectedNotice.target_audience === "all"
                    ? "bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-800/40 dark:border-slate-750 dark:text-slate-350"
                    : "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400"
                }`}
              >
                {getAudienceLabel(selectedNotice.target_audience)}
              </span>

              <h2 className="text-[17px] font-extrabold text-slate-900 dark:text-white leading-snug">
                {selectedNotice.title}
              </h2>

              <p className="text-[13.5px] text-slate-650 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                {selectedNotice.content}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end gap-3">
              {selectedNotice.attachment_url && (
                <a
                  href={selectedNotice.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-750 dark:text-slate-300"
                >
                  <Download className="w-4 h-4" />
                  Attachment
                </a>
              )}
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-white hover:opacity-95 transition-all shadow-md shadow-indigo-500/10"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
