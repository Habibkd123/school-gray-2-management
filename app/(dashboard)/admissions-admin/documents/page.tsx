"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  FileText, Eye, Download, Search, RefreshCw, Loader2, ClipboardList
} from "lucide-react";

interface DocumentItem {
  _id: string;
  application_no: string;
  student_name?: string;
  first_name: string;
  last_name: string;
  doc_name: string;
  doc_url: string;
  submission_date: string;
}

export default function DocumentsListPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      // Query first 100 applications to aggregate document lists
      const res = await fetch("/api/admissions?limit=100", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        const list: DocumentItem[] = [];
        json.data.forEach((app: any) => {
          const docKeys = ["photo", "birth_certificate", "transfer_certificate", "report_card", "aadhaar", "other_documents"];
          docKeys.forEach(key => {
            const docObj = app[key];
            if (docObj?.url) {
              list.push({
                _id: `${app._id}-${key}`,
                application_no: app.application_no,
                student_name: app.student_name,
                first_name: app.first_name,
                last_name: app.last_name,
                doc_name: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                doc_url: docObj.url,
                submission_date: app.submission_date,
              });
            }
          });
        });
        setDocs(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocs = docs.filter(d => {
    const s = search.toLowerCase();
    const studentName = d.student_name || `${d.first_name} ${d.last_name}`.trim();
    return (
      d.application_no.toLowerCase().includes(s) ||
      studentName.toLowerCase().includes(s) ||
      d.doc_name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6 text-left">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admissions Document Manager</h1>
          <p className="text-[12px] text-slate-500 mt-1 font-normal">Review and manage all uploaded documents from applicants</p>
        </div>
        <button
          onClick={fetchDocuments}
          className="btn btn-outline p-2 w-9 h-9 flex items-center justify-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm">
        {/* Search bar */}
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Files ledger</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student or file..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Loading documents...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-border rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <p className="text-[14px] font-bold text-slate-700 dark:text-slate-350">No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Student Applicant</th>
                  <th className="px-5 py-3.5">App Number</th>
                  <th className="px-5 py-3.5">Document Type</th>
                  <th className="px-5 py-3.5">Submission Date</th>
                  <th className="px-5 py-3.5 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[13.5px]">
                {filteredDocs.map(d => (
                  <tr key={d._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100">
                      {d.student_name || `${d.first_name} ${d.last_name}`.trim()}
                    </td>
                    <td className="px-5 py-4 font-sans font-semibold text-primary">
                      {d.application_no}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-350">
                      {d.doc_name}
                    </td>
                    <td className="px-5 py-4 text-slate-550 dark:text-slate-400">
                      {new Date(d.submission_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={d.doc_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 border border-border bg-white dark:bg-slate-900 rounded-lg hover:text-primary transition-colors cursor-pointer text-slate-550"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={d.doc_url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 border border-border bg-white dark:bg-slate-900 rounded-lg hover:text-primary transition-colors cursor-pointer text-slate-550"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
