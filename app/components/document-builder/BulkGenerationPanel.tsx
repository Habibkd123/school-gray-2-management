"use client";

/**
 * BulkGenerationPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Class-wide document generation panel used inside the Document Center.
 * Lets admins pick a class → select students → pick a template → generate
 * all documents in sequence with a live progress bar.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Users, FileText, ChevronDown, Search, Check, X, Loader2,
  AlertCircle, CheckCircle2, Play, RotateCcw, ExternalLink,
} from "lucide-react";
import { getTemplates } from "./store";
import type { TemplateMeta } from "./types";
import { encodeVariablesClient } from "@/lib/utils/variable-resolver";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkResult {
  studentId: string;
  studentName: string;
  status: "pending" | "running" | "done" | "error";
  url?: string;
  error?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────


// ─── Main Component ───────────────────────────────────────────────────────────

export function BulkGenerationPanel() {
  const router = useRouter();

  // ── State: Class & students ───────────────────────────────────────────────
  const [classes, setClasses]               = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");

  const [students, setStudents]             = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch]   = useState("");

  // ── State: Template ───────────────────────────────────────────────────────
  const [templates, setTemplates]             = useState<TemplateMeta[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // ── State: Document type ──────────────────────────────────────────────────
  const [docType, setDocType] = useState("report_card");

  // ── State: Bulk results ───────────────────────────────────────────────────
  const [results, setResults] = useState<BulkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);

  // ── Load classes ──────────────────────────────────────────────────────────
  useEffect(() => {
    setClassesLoading(true);
    fetch("/api/classes", { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => setClasses(d.data || d.classes || []))
      .catch(() => setClasses([]))
      .finally(() => setClassesLoading(false));

    setTemplates(getTemplates());
  }, []);

  // ── Load students when class changes ──────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) { setStudents([]); setSelectedStudents([]); return; }
    setStudentsLoading(true);
    fetch(`/api/students?class_id=${selectedClassId}&limit=200`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        const list = d.data?.students || d.students || d.data || [];
        setStudents(list);
        setSelectedStudents(list.map((s: any) => s._id));
      })
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [selectedClassId]);

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.admission_no?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s._id));
    }
  };

  // ── Bulk generate ─────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || selectedStudents.length === 0) return;
    setRunning(true);
    setDone(false);

    const initial: BulkResult[] = selectedStudents.map(id => {
      const s = students.find(x => x._id === id);
      return { studentId: id, studentName: s?.name || id, status: "pending" };
    });
    setResults(initial);

    const updated = [...initial];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "running" };
      setResults([...updated]);

      try {
        const res = await fetch("/api/documents/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            templateId: selectedTemplate.id,
            documentType: docType,
            referenceModule: "student",
            referenceId: updated[i].studentId,
            generatedFor: [updated[i].studentId],
          }),
        });

        const data = await res.json();
        const vars: Record<string, string> =
          (data.success && (data.data?.[0]?.variables || data.data?.variables)) || {
            student_name: updated[i].studentName,
            date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
          };

        const encoded = encodeVariablesClient(vars);
        const url = `/documents/builder/${selectedTemplate.id}?variables=${encoded}`;
        updated[i] = { ...updated[i], status: "done", url };
      } catch (e: any) {
        updated[i] = { ...updated[i], status: "error", error: e?.message || "Unknown error" };
      }

      setResults([...updated]);
      // small delay to avoid hammering the server
      await new Promise(r => setTimeout(r, 150));
    }

    setRunning(false);
    setDone(true);
  }, [selectedTemplate, selectedStudents, students, docType]);

  const reset = () => {
    setResults([]);
    setDone(false);
    setSelectedStudents(students.map(s => s._id));
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const doneCount  = results.filter(r => r.status === "done").length;
  const errorCount = results.filter(r => r.status === "error").length;
  const totalCount = results.length;
  const progress   = totalCount > 0 ? Math.round((doneCount + errorCount) / totalCount * 100) : 0;

  const canStart = !!selectedTemplate && selectedStudents.length > 0 && !running;

  return (
    <div className="space-y-6">

      {/* Config row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Class picker */}
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Class</label>
          <select
            value={selectedClassId}
            onChange={e => {
              const cls = classes.find(c => c._id === e.target.value);
              setSelectedClassId(e.target.value);
              setSelectedClassName(cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ""}` : "");
            }}
            className="px-3 py-2.5 border border-border rounded-xl text-[13px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none focus:border-primary/50"
          >
            <option value="">— Select Class —</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>
                {c.name}{c.section ? ` - ${c.section}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Document Type */}
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Document Type</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="px-3 py-2.5 border border-border rounded-xl text-[13px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none focus:border-primary/50"
          >
            <option value="report_card">Report Card</option>
            <option value="bonafide">Bonafide Certificate</option>
            <option value="transfer_cert">Transfer Certificate</option>
            <option value="character_cert">Character Certificate</option>
            <option value="fee_receipt">Fee Receipt</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Template picker */}
        <div className="flex flex-col gap-1.5 text-left relative">
          <label className="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Template</label>
          <button
            onClick={() => setShowTemplateDropdown(p => !p)}
            className="flex items-center justify-between px-3 py-2.5 border border-border rounded-xl text-[13px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none hover:border-primary/50 transition-colors"
          >
            <span className={selectedTemplate ? "font-semibold" : "text-slate-400"}>
              {selectedTemplate?.name || "— Pick Template —"}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showTemplateDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowTemplateDropdown(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-xl z-40 max-h-52 overflow-y-auto py-1">
                {templates.length === 0 ? (
                  <p className="px-4 py-3 text-[12px] text-slate-400">No templates found.</p>
                ) : (
                  templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => { setSelectedTemplate(tpl); setShowTemplateDropdown(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left transition-colors"
                    >
                      <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{tpl.name}</span>
                      {selectedTemplate?.id === tpl.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-auto" />}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Student selector */}
      {selectedClassId && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                Students in {selectedClassName}
              </span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full">
                {selectedStudents.length} selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-[12px] border border-border rounded-lg outline-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-40"
                />
              </div>
              <button
                onClick={toggleAll}
                className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {selectedStudents.length === filteredStudents.length ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>

          {studentsLoading ? (
            <div className="flex items-center justify-center p-8 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-[13px] text-slate-500">Loading students…</span>
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
              {filteredStudents.length === 0 ? (
                <p className="p-6 text-center text-[13px] text-slate-400">No students found.</p>
              ) : (
                filteredStudents.map(s => (
                  <label
                    key={s._id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s._id)}
                      onChange={() => toggleStudent(s._id)}
                      className="rounded border-slate-300 accent-primary w-4 h-4 flex-shrink-0"
                    />
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{s.name}</p>
                      {s.admission_no && <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.admission_no}</p>}
                    </div>
                    {results.find(r => r.studentId === s._id) && (
                      <div className="ml-auto">
                        {results.find(r => r.studentId === s._id)?.status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        {results.find(r => r.studentId === s._id)?.status === "error" && <AlertCircle className="w-4 h-4 text-rose-500" />}
                        {results.find(r => r.studentId === s._id)?.status === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress bar (during/after run) */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-bold text-slate-900 dark:text-white">
              {running ? "Generating…" : done ? "Generation Complete" : "Progress"}
            </span>
            <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
              {doneCount + errorCount} / {totalCount}
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex gap-4 text-[12px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✅ {doneCount} done</span>
            {errorCount > 0 && <span className="text-rose-500 font-semibold">❌ {errorCount} failed</span>}
            {running && <span className="text-slate-500">⏳ {totalCount - doneCount - errorCount} pending</span>}
          </div>

          {/* Individual result links */}
          {done && (
            <div className="space-y-1 max-h-40 overflow-y-auto pt-2 border-t border-border">
              {results.map(r => (
                <div key={r.studentId} className="flex items-center justify-between py-1">
                  <span className="text-[12px] text-slate-700 dark:text-slate-300 font-medium">{r.studentName}</span>
                  {r.status === "done" && r.url && (
                    <button
                      onClick={() => router.push(r.url!)}
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </button>
                  )}
                  {r.status === "error" && (
                    <span className="text-[11px] text-rose-500">{r.error || "Failed"}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 justify-end pt-2">
        {done && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        )}
        <button
          onClick={handleGenerate}
          disabled={!canStart}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? "Generating…" : `Generate ${selectedStudents.length > 0 ? selectedStudents.length : ""} Documents`}
        </button>
      </div>
    </div>
  );
}

export default BulkGenerationPanel;
