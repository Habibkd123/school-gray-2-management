"use client";

/**
 * GenerateDocumentWizard
 * ─────────────────────────────────────────────────────────────────────────────
 * A premium 5-step modal wizard that bridges any ERP module → Document Builder.
 *
 * Step 1: Choose Document Type  (filtered by module context)
 * Step 2: Choose Record(s)      — student / teacher / payment
 * Step 3: Choose Template       (filtered by selected document type's categoryId)
 * Step 4: Variable Preview      — shows resolved key→value table
 * Step 5: Generate              — opens builder with encoded vars
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X, ChevronRight, ChevronLeft, Search, CheckCircle2, FileText, GraduationCap,
  Receipt, Wallet, BookOpen, Users, UserCog, Building2, Sparkles, Eye,
  FileCheck, Loader2, AlertCircle, Check, Plus, LayoutTemplate,
} from "lucide-react";
import { getTemplates } from "./store";
import type { TemplateMeta } from "./types";
import { encodeVariablesClient } from "@/lib/utils/variable-resolver";
import { useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/utils/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentTypeOption = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** ERP module this doc type belongs to (for filtering in Step 1) */
  module: string;
  color: string;
  /**
   * The template store categoryId(s) that correspond to this doc type.
   * Used to filter templates in Step 3.
   * e.g. ["report_card"] or ["student", "certificate"]
   */
  templateCategories: string[];
  /**
   * Which ERP modules should see this document type in Step 1.
   * An empty array means it's visible from all modules.
   */
  visibleFromModules: string[];
};

export type ReferenceModule = "student" | "teacher" | "exam" | "fees" | "salary" | "school" | "custom";

interface GenerateDocumentWizardProps {
  open: boolean;
  onClose: () => void;
  defaultModule?: ReferenceModule;
  defaultStudentId?: string;
  defaultStudentName?: string;
  defaultReferenceId?: string;
  defaultReferenceLabel?: string;
  schoolId?: string;
}

// ─── Document Types Catalog ───────────────────────────────────────────────────
// Each entry carries `templateCategories` (for Step 3 filtering)
// and `visibleFromModules` (for Step 1 filtering by ERP context).

const DOC_TYPES: DocumentTypeOption[] = [
  {
    id: "bonafide",
    label: "Bonafide Certificate",
    description: "Confirms student enrollment status",
    icon: <FileCheck className="w-5 h-5" />,
    module: "student",
    color: "blue",
    templateCategories: ["certificate", "student"],
    visibleFromModules: ["student", "custom"],
  },
  {
    id: "transfer_cert",
    label: "Transfer Certificate",
    description: "Student transfer / leaving school document",
    icon: <FileText className="w-5 h-5" />,
    module: "student",
    color: "orange",
    templateCategories: ["certificate", "student"],
    visibleFromModules: ["student", "custom"],
  },
  {
    id: "character_cert",
    label: "Character Certificate",
    description: "Character and conduct certificate",
    icon: <CheckCircle2 className="w-5 h-5" />,
    module: "student",
    color: "green",
    templateCategories: ["certificate", "student"],
    visibleFromModules: ["student", "custom"],
  },
  {
    id: "report_card",
    label: "Report Card",
    description: "Academic results with subject-wise grades",
    icon: <GraduationCap className="w-5 h-5" />,
    module: "exam",
    color: "purple",
    templateCategories: ["report_card", "exam"],
    visibleFromModules: ["student", "exam", "custom"],
  },
  {
    id: "fee_receipt",
    label: "Fee Receipt",
    description: "Payment acknowledgement for fees",
    icon: <Receipt className="w-5 h-5" />,
    module: "fees",
    color: "teal",
    templateCategories: ["fees"],
    visibleFromModules: ["fees", "student", "custom"],
  },
  {
    id: "salary_slip",
    label: "Salary Slip",
    description: "Teacher monthly salary statement",
    icon: <Wallet className="w-5 h-5" />,
    module: "salary",
    color: "yellow",
    templateCategories: ["teacher"],
    visibleFromModules: ["teacher", "salary", "custom"],
  },
  {
    id: "appointment_letter",
    label: "Appointment Letter",
    description: "Letter of appointment for new staff",
    icon: <UserCog className="w-5 h-5" />,
    module: "teacher",
    color: "indigo",
    templateCategories: ["letter", "teacher"],
    visibleFromModules: ["teacher", "custom"],
  },
  {
    id: "experience_letter",
    label: "Experience Letter",
    description: "Service / experience certificate for staff",
    icon: <BookOpen className="w-5 h-5" />,
    module: "teacher",
    color: "pink",
    templateCategories: ["letter", "teacher"],
    visibleFromModules: ["teacher", "custom"],
  },
  {
    id: "circular",
    label: "Circular / Notice",
    description: "School-wide circular or notice",
    icon: <Building2 className="w-5 h-5" />,
    module: "school",
    color: "slate",
    templateCategories: ["circular", "notice"],
    visibleFromModules: [], // visible from all modules
  },
  {
    id: "custom",
    label: "Custom Document",
    description: "Any document using a custom template",
    icon: <Sparkles className="w-5 h-5" />,
    module: "custom",
    color: "rose",
    templateCategories: [], // shows all templates when empty
    visibleFromModules: [], // always visible
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50",
  orange: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/50",
  green:  "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50",
  purple: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/50",
  teal:   "bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/50",
  yellow: "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800/50",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/50",
  pink:   "bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800/50",
  slate:  "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/50",
  rose:   "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50",
};

// Category display names for the breadcrumb in Step 3
const CATEGORY_LABELS: Record<string, string> = {
  report_card:  "Report Card",
  student:      "Student",
  certificate:  "Certificate",
  teacher:      "Teacher",
  fees:         "Fee",
  exam:         "Exam",
  letter:       "Letter",
  circular:     "Circular",
  notice:       "Notice",
  blank:        "Blank",
};

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ num, active, done }: { num: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all
      ${done  ? "bg-primary border-primary text-white" :
        active ? "bg-white dark:bg-slate-900 border-primary text-primary" :
                 "bg-white dark:bg-slate-900 border-border text-slate-400"}`}>
      {done ? <Check className="w-3.5 h-3.5" /> : num}
    </div>
  );
}

// ─── Template Card (Step 3) ───────────────────────────────────────────────────
function TemplateCard({
  tpl,
  selected,
  onSelect,
}: {
  tpl: TemplateMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  const catLabel = CATEGORY_LABELS[tpl.categoryId] || tpl.categoryId;
  const updatedDate = new Date(tpl.updatedAt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border-2 transition-all cursor-pointer overflow-hidden group
        ${selected
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-border hover:border-primary/40 hover:shadow-sm bg-white dark:bg-slate-900"}`}
    >
      {/* Thumbnail strip */}
      <div
        className={`h-1.5 w-full transition-all ${
          selected
            ? "bg-primary"
            : "bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 group-hover:from-primary/40 group-hover:to-primary/20"
        }`}
      />

      <div className="flex items-start gap-3 p-3.5">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all
          ${selected
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary"
          }`}
        >
          <FileText className="w-4 h-4" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-bold truncate transition-colors ${selected ? "text-primary" : "text-slate-900 dark:text-white group-hover:text-primary"}`}>
            {tpl.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Category badge */}
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
              {catLabel}
            </span>
            {/* Paper size */}
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {tpl.pageSize} · {tpl.orientation === "portrait" ? "Portrait" : "Landscape"}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">
            Updated {updatedDate}
          </p>
        </div>

        {/* Check */}
        {selected && <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function GenerateDocumentWizard({
  open,
  onClose,
  defaultModule,
  defaultStudentId,
  defaultStudentName,
  defaultReferenceId,
  defaultReferenceLabel,
}: GenerateDocumentWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [selectedDocType, setSelectedDocType] = useState<DocumentTypeOption | null>(null);

  // Step 2
  const [recordSearch, setRecordSearch]   = useState("");
  const [recordResults, setRecordResults] = useState<any[]>([]);
  const [recordLoading, setRecordLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Step 3
  const [allTemplates, setAllTemplates]       = useState<TemplateMeta[]>([]);
  const [templateSearch, setTemplateSearch]   = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null);

  // Step 4
  const [resolvedVars, setResolvedVars]     = useState<Record<string, string>>({});
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError]     = useState("");

  // Step 5
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);
  const [builderUrl, setBuilderUrl] = useState("");

  // ── Derived module ──────────────────────────────────────────────────────────
  const activeModule: ReferenceModule = (selectedDocType?.module as ReferenceModule) || defaultModule || "student";

  // ── Step 1: Filter doc types by ERP module context ──────────────────────────
  const filteredDocTypes = useMemo(() => {
    if (!defaultModule || defaultModule === "custom") return DOC_TYPES;
    return DOC_TYPES.filter(
      (d) => d.visibleFromModules.length === 0 || d.visibleFromModules.includes(defaultModule)
    );
  }, [defaultModule]);

  // ── Step 3: Filter templates by selected doc type category ─────────────────
  const filteredTemplates = useMemo(() => {
    if (!selectedDocType) return allTemplates;
    // "custom" shows everything
    if (selectedDocType.templateCategories.length === 0) return allTemplates;
    return allTemplates.filter((t) =>
      selectedDocType.templateCategories.includes(t.categoryId)
    );
  }, [allTemplates, selectedDocType]);

  // ── Step 3: Search within filtered templates only ───────────────────────────
  const searchedTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return filteredTemplates;
    return filteredTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.categoryId.toLowerCase().includes(q)
    );
  }, [filteredTemplates, templateSearch]);

  // ── Reset on open/close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedDocType(null);
    setSelectedRecord(null);
    setSelectedTemplate(null);
    setResolvedVars({});
    setResolveError("");
    setGenerating(false);
    setGenerated(false);
    setBuilderUrl("");
    setRecordSearch("");
    setRecordResults([]);
    setTemplateSearch("");
  }, [open]);

  // ── Pre-fill defaults when module is known ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (defaultStudentId && defaultStudentName) {
      setSelectedRecord({ _id: defaultStudentId, name: defaultStudentName, _type: "student" });
    } else if (defaultReferenceId && defaultReferenceLabel) {
      setSelectedRecord({ _id: defaultReferenceId, name: defaultReferenceLabel, _type: activeModule });
    }
  }, [open, defaultStudentId, defaultStudentName, defaultReferenceId, defaultReferenceLabel]);

  // ── Load ALL templates when we reach step 3 — filtering is done in useMemo ──
  useEffect(() => {
    if (step !== 3) return;
    const all = getTemplates();
    setAllTemplates(all);
    setTemplateSearch("");
    setSelectedTemplate(null); // reset on re-enter
  }, [step]);

  // ── Record search ────────────────────────────────────────────────────────────
  const searchRecords = useCallback(async (q: string) => {
    if (!q.trim()) { setRecordResults([]); return; }
    setRecordLoading(true);
    try {
      let url = "";
      if (activeModule === "student") url = `/api/students?search=${encodeURIComponent(q)}&limit=10`;
      else if (activeModule === "teacher") url = `/api/teachers?search=${encodeURIComponent(q)}&limit=10`;
      else if (activeModule === "salary") url = `/api/salaries?search=${encodeURIComponent(q)}&limit=10`;
      else if (activeModule === "fees") url = `/api/fee-payments?search=${encodeURIComponent(q)}&limit=10`;
      if (!url) { setRecordResults([]); setRecordLoading(false); return; }

      const res = await fetch(url, { headers: getAuthHeaders() as any });
      const data = await res.json();
      const items = (data.data?.students || data.data?.teachers || data.data?.payments || data.data || []).slice(0, 10);
      setRecordResults(items.map((r: any) => ({ ...r, _type: activeModule })));
    } catch {
      setRecordResults([]);
    } finally {
      setRecordLoading(false);
    }
  }, [activeModule]);

  useEffect(() => {
    const t = setTimeout(() => searchRecords(recordSearch), 350);
    return () => clearTimeout(t);
  }, [recordSearch, searchRecords]);

  // ── Variable resolution (Step 4) ─────────────────────────────────────────────
  const resolveVariables = useCallback(async () => {
    if (!selectedTemplate || !selectedRecord) return;
    setResolveLoading(true);
    setResolveError("");
    try {
      const body: Record<string, any> = {
        templateId: selectedTemplate.id,
        documentType: selectedDocType?.id || "custom",
        referenceModule: activeModule,
        referenceId: selectedRecord._id,
        generatedFor: activeModule === "student" ? [selectedRecord._id] : undefined,
      };
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getAuthHeaders() as any) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success && data.data?.[0]?.variables) {
        setResolvedVars(data.data[0].variables);
      } else if (data.success && data.data?.variables) {
        setResolvedVars(data.data.variables);
      } else {
        setResolvedVars({
          student_name: selectedRecord.name || "",
          reference_id: selectedRecord._id || "",
          date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
        });
      }
    } catch {
      setResolveError("Could not resolve variables. You can still proceed — the builder will use defaults.");
      setResolvedVars({
        student_name: selectedRecord.name || "",
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
      });
    } finally {
      setResolveLoading(false);
    }
  }, [selectedTemplate, selectedRecord, selectedDocType, activeModule]);

  useEffect(() => {
    if (step === 4) resolveVariables();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate (Step 5) ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
      // Debug: log variable map being passed to builder
      console.log("[Wizard→Builder] Variables generated in Step 4:", resolvedVars);
      console.log("[Wizard→Builder] Total variables to pass:", Object.keys(resolvedVars).length);

      const encoded = encodeVariablesClient(resolvedVars);

      // BUG FIX: btoa() produces + and / which are special URL characters.
      // Without encodeURIComponent, + is decoded as space by URL parsers,
      // corrupting the base64 string and making decodeVariablesClient return {}.
      const safeEncoded = encodeURIComponent(encoded);

      const url = `/documents/builder/${selectedTemplate.id}?variables=${safeEncoded}&generatedFor=${encodeURIComponent(selectedRecord?.name || "")}&generatedTitle=${encodeURIComponent(selectedTemplate.name || "")}`;
      console.log("[Wizard→Builder] Builder URL constructed:", url.substring(0, 120) + "...");
      setBuilderUrl(url);
      setGenerated(true);
    } catch (e) {
      console.error("[Wizard→Builder] Generate error:", e);
    } finally {
      setGenerating(false);
    }
  }, [selectedTemplate, resolvedVars, selectedRecord]);

  useEffect(() => {
    if (step === 5 && !generated) handleGenerate();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBuilder = () => {
    if (builderUrl) { router.push(builderUrl); onClose(); }
  };

  // ── Navigation ────────────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 1) return !!selectedDocType;
    if (step === 2) return !!selectedRecord;
    if (step === 3) return !!selectedTemplate;
    return true;
  };

  const next = () => { if (canNext()) setStep(s => Math.min(s + 1, 5)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  if (!open) return null;

  const STEPS = ["Document Type", "Select Record", "Template", "Preview", "Generate"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Generate Document</h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Step {step} of {STEPS.length} — {STEPS[step - 1]}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-border flex-shrink-0 overflow-x-auto">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <StepDot num={i + 1} active={step === i + 1} done={step > i + 1} />
                <span className={`text-[10px] font-semibold whitespace-nowrap ${step === i + 1 ? "text-primary" : step > i + 1 ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 min-w-[16px] mx-1 mb-4 transition-colors ${step > i + 1 ? "bg-primary" : "bg-border"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Document Type ────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-4">
                Choose the type of document you want to generate.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDocTypes.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocType(doc)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer
                      ${selectedDocType?.id === doc.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${COLOR_MAP[doc.color]}`}>
                      {doc.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white">{doc.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{doc.description}</p>
                    </div>
                    {selectedDocType?.id === doc.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Select Record ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Select the {activeModule} record this document is for.
              </p>

              {selectedRecord && (
                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white">{selectedRecord.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{activeModule} record pre-filled</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="text-[11px] text-slate-500 hover:text-rose-500 font-semibold transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {!selectedRecord && (
                <>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder={`Search ${activeModule}s...`}
                      value={recordSearch}
                      onChange={e => setRecordSearch(e.target.value)}
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    {recordLoading && <Loader2 className="w-4 h-4 animate-spin text-primary absolute right-3 top-3" />}
                  </div>

                  {recordResults.length > 0 && (
                    <div className="space-y-1 max-h-60 overflow-y-auto border border-border rounded-xl overflow-hidden">
                      {recordResults.map(r => (
                        <button
                          key={r._id}
                          onClick={() => { setSelectedRecord(r); setRecordSearch(""); setRecordResults([]); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-primary">{(r.name || "?")[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{r.name}</p>
                            {r.admission_no && <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.admission_no}</p>}
                            {r.employee_id  && <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.employee_id}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {recordSearch && !recordLoading && recordResults.length === 0 && (
                    <p className="text-[13px] text-slate-400 text-center py-4">No results found for "{recordSearch}"</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Template — CONTEXT-AWARE ────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-3">
              {/* Breadcrumb / context pill */}
              {selectedDocType && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Showing templates for</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${COLOR_MAP[selectedDocType.color]}`}>
                    {selectedDocType.icon}
                    {selectedDocType.label}
                  </span>
                </div>
              )}

              {/* Search — scoped to filtered templates only */}
              {filteredTemplates.length > 0 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${selectedDocType?.label || ""} templates…`}
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-primary/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  {templateSearch && (
                    <button
                      onClick={() => setTemplateSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Template list — filtered + searched */}
              {searchedTemplates.length > 0 ? (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
                  {searchedTemplates.map(tpl => (
                    <TemplateCard
                      key={tpl.id}
                      tpl={tpl}
                      selected={selectedTemplate?.id === tpl.id}
                      onSelect={() => setSelectedTemplate(tpl)}
                    />
                  ))}
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <LayoutTemplate className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                      {templateSearch
                        ? `No "${templateSearch}" templates found`
                        : `No ${selectedDocType?.label || ""} templates yet`}
                    </p>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                      {templateSearch
                        ? "Try a different search term within this category."
                        : `Create a template in the Template Library with category "${
                            selectedDocType?.templateCategories.map(c => CATEGORY_LABELS[c] || c).join(" or ") || "Custom"
                          }" to see it here.`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {templateSearch ? (
                      <button
                        onClick={() => setTemplateSearch("")}
                        className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Clear Search
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => { router.push("/documents/templates"); onClose(); }}
                          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LayoutTemplate className="w-3.5 h-3.5" /> Browse Library
                        </button>
                        <button
                          onClick={() => { router.push("/documents/templates/new"); onClose(); }}
                          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[12px] font-bold rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Create Template
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Count hint */}
              {searchedTemplates.length > 0 && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-right pt-1">
                  {templateSearch
                    ? `${searchedTemplates.length} of ${filteredTemplates.length} templates match`
                    : `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? "s" : ""} available`}
                </p>
              )}
            </div>
          )}

          {/* ── Step 4: Variable Preview ─────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                Review the values that will be auto-filled into your document.
              </p>

              {resolveLoading && (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-[13px] text-slate-500 dark:text-slate-400">Resolving variables…</span>
                </div>
              )}

              {resolveError && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-700 dark:text-amber-400">{resolveError}</p>
                </div>
              )}

              {!resolveLoading && Object.keys(resolvedVars).length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border">
                        <th className="px-4 py-2.5 text-left font-bold text-slate-600 dark:text-slate-300 w-2/5">Variable</th>
                        <th className="px-4 py-2.5 text-left font-bold text-slate-600 dark:text-slate-300">Resolved Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {Object.entries(resolvedVars).map(([key, val]) => (
                        <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">{`{{${key}}}`}</td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200 font-medium truncate max-w-0">
                            {val || <span className="text-slate-400 italic">empty</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!resolveLoading && Object.keys(resolvedVars).length === 0 && !resolveError && (
                <div className="text-center py-8 text-slate-400">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px]">No variables found in this template.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Generate ─────────────────────────────────────────────── */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center py-8 gap-5 text-center">
              {generating && (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Preparing document…</p>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">Encoding variables and loading builder.</p>
                </>
              )}

              {!generating && generated && (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-slate-900 dark:text-white">Document Ready!</p>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                      Template: <strong className="text-slate-700 dark:text-slate-200">{selectedTemplate?.name}</strong>
                      <br />Record: <strong className="text-slate-700 dark:text-slate-200">{selectedRecord?.name}</strong>
                    </p>
                  </div>

                  <button
                    onClick={openBuilder}
                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[var(--primary-hover)] text-white text-[14px] font-bold rounded-xl shadow-lg transition-all hover:shadow-primary/30 hover:scale-105"
                  >
                    <Eye className="w-4 h-4" />
                    Open in Document Builder
                  </button>

                  <p className="text-[11px] text-slate-400">
                    The builder will open with all variables pre-filled. You can print or download from there.
                  </p>
                </>
              )}

              {!generating && !generated && (
                <>
                  <AlertCircle className="w-10 h-10 text-rose-400" />
                  <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200">Something went wrong</p>
                  <button onClick={handleGenerate} className="px-4 py-2 bg-primary text-white text-[13px] font-bold rounded-lg">
                    Try Again
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 5 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
            <button
              onClick={step === 1 ? onClose : back}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 1 ? "Cancel" : "Back"}
            </button>

            <button
              onClick={next}
              disabled={!canNext()}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-bold rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {step === 4 ? "Generate" : "Continue"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="flex justify-center px-6 py-4 border-t border-border flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
            <button
              onClick={onClose}
              className="px-5 py-2 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GenerateDocumentWizard;
