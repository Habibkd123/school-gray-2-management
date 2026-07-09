"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, Check, ArrowLeft, Search, Loader2, Sparkles, AlertCircle, FileText, CheckCircle2, User, Database } from "lucide-react";
import { BUILT_IN_CATEGORIES } from "./store";
import { TEMPLATE_DEFINITIONS } from "./templates-data";
import type { TemplateDefinition, DocumentCategory } from "./types";
import { getAuthHeaders } from "@/lib/utils/session";

// Category icons mapping
import {
  GraduationCap, Users, Award, CreditCard, ClipboardList,
  Bell, Megaphone, File
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap size={28} />,
  Users: <Users size={28} />,
  Award: <Award size={28} />,
  CreditCard: <CreditCard size={28} />,
  ClipboardList: <ClipboardList size={28} />,
  Bell: <Bell size={28} />,
  Megaphone: <Megaphone size={28} />,
  FileText: <FileText size={28} />,
  File: <File size={28} />,
};

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    categoryId: string,
    template: TemplateDefinition,
    title: string,
    recordInfo?: { id: string; name: string; type: string; variables: Record<string, string> }
  ) => void;
  preselectedCategoryId?: string;
  preselectedTemplateId?: string;
}

type Step = 1 | 2 | 3;
type Mode = "blank" | "attach";

export function WizardModal({ isOpen, onClose, onCreate, preselectedCategoryId, preselectedTemplateId }: WizardModalProps) {
  const [step, setStep] = useState<Step>(preselectedCategoryId ? 2 : 1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(preselectedCategoryId ?? "");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(preselectedTemplateId ?? "");
  const [docTitle, setDocTitle] = useState("");

  // Step 3 ERP linkage states
  const [linkMode, setLinkMode] = useState<Mode>("blank");
  const [recordSearch, setRecordSearch] = useState("");
  const [recordResults, setRecordResults] = useState<any[]>([]);
  const [recordLoading, setRecordLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Variables resolution
  const [resolvedVars, setResolvedVars] = useState<Record<string, string>>({});
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStep(preselectedCategoryId ? 2 : 1);
    setSelectedCategoryId(preselectedCategoryId ?? "");
    setSelectedTemplateId(preselectedTemplateId ?? "");
    setDocTitle("");
    setLinkMode("blank");
    setSelectedRecord(null);
    setResolvedVars({});
    setRecordSearch("");
    setRecordResults([]);
  }, [isOpen, preselectedCategoryId, preselectedTemplateId]);

  const selectedCategory = BUILT_IN_CATEGORIES.find((c) => c.id === selectedCategoryId);
  const templates = TEMPLATE_DEFINITIONS.filter((t) => t.categoryId === selectedCategoryId);
  const selectedTemplate = TEMPLATE_DEFINITIONS.find((t) => t.id === selectedTemplateId);

  // Map category to ERP module
  const erpModule = (() => {
    const cid = selectedCategoryId;
    if (["student", "certificate", "exam", "report_card"].includes(cid)) return "student";
    if (["teacher", "letter"].includes(cid)) return "teacher";
    if (["fees"].includes(cid)) return "fees";
    return "student"; // fallback
  })();

  // Record Search
  const searchRecords = useCallback(async (q: string) => {
    if (!q.trim()) { setRecordResults([]); return; }
    setRecordLoading(true);
    try {
      let url = "";
      if (erpModule === "student") url = `/api/students?search=${encodeURIComponent(q)}&limit=10`;
      else if (erpModule === "teacher") url = `/api/teachers?search=${encodeURIComponent(q)}&limit=10`;
      else if (erpModule === "fees") url = `/api/fee-payments?search=${encodeURIComponent(q)}&limit=10`;

      if (!url) { setRecordResults([]); setRecordLoading(false); return; }

      const res = await fetch(url, { headers: getAuthHeaders() as any });
      const data = await res.json();
      const items = (data.data?.students || data.data?.teachers || data.data?.payments || data.data || []).slice(0, 10);
      setRecordResults(items.map((r: any) => ({ ...r, _type: erpModule })));
    } catch {
      setRecordResults([]);
    } finally {
      setRecordLoading(false);
    }
  }, [erpModule]);

  useEffect(() => {
    if (linkMode !== "attach" || !recordSearch) return;
    const t = setTimeout(() => searchRecords(recordSearch), 350);
    return () => clearTimeout(t);
  }, [recordSearch, searchRecords, linkMode]);

  // Variables Resolution
  const resolveVariables = useCallback(async (record: any) => {
    if (!selectedTemplate || !record) return;
    setResolveLoading(true);
    setResolveError("");
    try {
      const body: Record<string, any> = {
        templateId: selectedTemplate.id,
        documentType: selectedCategoryId || "custom",
        referenceModule: erpModule,
        referenceId: record._id,
        generatedFor: erpModule === "student" ? [record._id] : undefined,
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
          student_name: record.name || "",
          reference_id: record._id || "",
          date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
        });
      }
    } catch {
      setResolveError("Using default client-side placeholders due to resolution failure.");
      setResolvedVars({
        student_name: record.name || "",
        reference_id: record._id || "",
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
      });
    } finally {
      setResolveLoading(false);
    }
  }, [selectedTemplate, selectedCategoryId, erpModule]);

  const handleRecordSelect = (record: any) => {
    setSelectedRecord(record);
    setRecordSearch("");
    setRecordResults([]);
    resolveVariables(record);
  };

  const handleCreate = () => {
    if (!selectedTemplate) return;
    const title = docTitle.trim() || `${selectedCategory?.name ?? "Document"} — ${selectedTemplate.name}`;
    
    if (linkMode === "attach" && selectedRecord) {
      onCreate(selectedCategoryId, selectedTemplate, title, {
        id: selectedRecord._id,
        name: selectedRecord.name,
        type: erpModule,
        variables: resolvedVars,
      });
    } else {
      onCreate(selectedCategoryId, selectedTemplate, title);
    }
    
    onClose();
    resetState();
  };

  const resetState = () => {
    setStep(1);
    setSelectedCategoryId("");
    setSelectedTemplateId("");
    setDocTitle("");
    setLinkMode("blank");
    setSelectedRecord(null);
    setResolvedVars({});
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "rgba(15, 35, 54, 0.7)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "white",
        borderRadius: 20,
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        width: "100%",
        maxWidth: step === 2 ? 820 : 680,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "max-width 0.3s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer flex items-center justify-center text-[#475569] hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1E3A5F", margin: 0 }}>
                {step === 1 ? "Choose a Category" : step === 2 ? "Choose a Template" : "Document & ERP Connection"}
              </h2>
              <p style={{ fontSize: 12, color: "#94A3B8", margin: "3px 0 0", fontWeight: 500 }}>
                Step {step} of 3
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: s < step ? "#1E3A5F" : s === step ? "#1E3A5F" : "#F1F5F9",
                  color: s <= step ? "white" : "#94A3B8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  transition: "all 0.2s",
                }} className="flex items-center justify-center">
                  {s < step ? <Check size={13} /> : s}
                </div>
                {s < 3 && <div style={{ width: 20, height: 2, background: s < step ? "#1E3A5F" : "#F1F5F9", borderRadius: 2, transition: "background 0.2s" }} />}
              </div>
            ))}
          </div>

          <button onClick={handleClose} className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer flex items-center justify-center text-[#475569] hover:bg-slate-50 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
          {/* ── Step 1: Category ───────────────────────── */}
          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {BUILT_IN_CATEGORIES.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategoryId(cat.id); setSelectedTemplateId(""); }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "20px 12px",
                      borderRadius: 14,
                      border: `2px solid ${isSelected ? "#1E3A5F" : "#E2E8F0"}`,
                      background: isSelected ? "#EFF6FF" : "white",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = "#93C5FD"; e.currentTarget.style.background = "#F8FAFC"; }}}
                    onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.background = "white"; }}}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isSelected ? "#1E3A5F" : "#F8FAFC",
                      color: isSelected ? "white" : "#475569",
                      transition: "all 0.15s",
                    }}>
                      {ICON_MAP[cat.icon] ?? <File size={28} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#1E3A5F" : "#231F20", marginBottom: 3 }}>{cat.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{cat.description}</div>
                    </div>
                    {isSelected && <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={12} color="white" /></div>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Step 2: Template ───────────────────────── */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 13, color: "#64748B", fontWeight: 500, marginBottom: 20, marginTop: -4 }}>
                Choose a template for <strong style={{ color: "#1E3A5F" }}>{selectedCategory?.name}</strong> documents
              </p>
              {templates.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-[14px] font-bold text-slate-700">No templates found for this category</p>
                  <p className="text-[12px] text-slate-400 mt-1">Please create a template under "{selectedCategory?.name}" category first.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {templates.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        style={{
                          display: "flex", flexDirection: "column",
                          border: `2px solid ${isSelected ? "#1E3A5F" : "#E2E8F0"}`,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "white",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#93C5FD"; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#E2E8F0"; }}
                      >
                        {/* Thumbnail */}
                        <div style={{ height: 120, background: tpl.thumbnailBg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {/* Decorative lines mimicking a document */}
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: 16 }}>
                            <div style={{ width: "70%", height: 3, background: tpl.thumbnailAccent, borderRadius: 2, opacity: 0.9 }} />
                            <div style={{ width: "100%", height: 1.5, background: "rgba(255,255,255,0.25)", borderRadius: 2 }} />
                            {[1, 2, 3, 4].map((i) => <div key={i} style={{ width: `${85 - i * 5}%`, height: 1.5, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />)}
                            <div style={{ width: "50%", height: 1.5, background: "rgba(255,255,255,0.15)", borderRadius: 2 }} />
                          </div>
                          {isSelected && (
                            <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                              <Check size={12} color="white" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 4 }}>{tpl.name}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500, marginBottom: 6 }}>{tpl.description}</div>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "#F8FAFC", borderRadius: 6, border: "1px solid #E2E8F0", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "capitalize" }}>
                            {tpl.orientation} · {tpl.pageSize}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Attach ERP Record (Optional) ────────────────────────── */}
          {step === 3 && selectedTemplate && (
            <div style={{ maxWidth: 520, margin: "0 auto" }} className="space-y-6">
              {/* Template summary pill */}
              <div style={{ padding: 14, background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: selectedTemplate.thumbnailBg, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1E3A5F" }}>{selectedTemplate.name}</div>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{selectedCategory?.name} · {selectedTemplate.orientation} · {selectedTemplate.pageSize}</div>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Document Title</label>
                <input
                  type="text"
                  placeholder={`${selectedCategory?.name ?? "Document"} — ${selectedTemplate.name}`}
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[13px] font-semibold outline-none focus:border-[#1E3A5F] bg-white text-slate-800"
                />
              </div>

              {/* Tabs selector */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Record Linkage</label>
                <div className="flex border border-[#E2E8F0] rounded-lg overflow-hidden bg-slate-50 p-1 gap-1">
                  <button
                    onClick={() => { setLinkMode("blank"); setSelectedRecord(null); }}
                    className={`flex-1 py-2 text-[12px] font-bold rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all ${linkMode === "blank" ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Create Blank Document
                  </button>
                  <button
                    onClick={() => setLinkMode("attach")}
                    className={`flex-1 py-2 text-[12px] font-bold rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all ${linkMode === "attach" ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Attach ERP Record
                  </button>
                </div>
              </div>

              {/* ERP Selection Content */}
              {linkMode === "attach" && (
                <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                  {selectedRecord ? (
                    /* Attached Record summary card */
                    <div className="flex items-center justify-between p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">{selectedRecord.name}</p>
                          <p className="text-[11px] text-slate-500 capitalize">{erpModule} record linked</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedRecord(null); setResolvedVars({}); }}
                        className="text-[11px] text-slate-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                      >
                        Change Record
                      </button>
                    </div>
                  ) : (
                    /* Search input */
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder={`Search ${erpModule}s to link…`}
                        value={recordSearch}
                        onChange={e => setRecordSearch(e.target.value)}
                        autoFocus
                        className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-indigo-500 bg-white text-slate-800"
                      />
                      {recordLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600 absolute right-3 top-3" />}

                      {recordResults.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-[999] overflow-hidden max-h-52 overflow-y-auto">
                          {recordResults.map(r => (
                            <button
                              key={r._id}
                              onClick={() => handleRecordSelect(r)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-indigo-600">{(r.name || "?")[0].toUpperCase()}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-bold text-slate-900 truncate">{r.name}</p>
                                {r.admission_no && <p className="text-[10.5px] text-slate-500">Adm No: {r.admission_no}</p>}
                                {r.employee_id && <p className="text-[10.5px] text-slate-500">Emp ID: {r.employee_id}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {recordSearch && !recordLoading && recordResults.length === 0 && (
                        <p className="text-[12px] text-slate-400 text-center py-4 bg-slate-50/50 rounded-lg mt-1 border border-slate-100">
                          No {erpModule} records found for "{recordSearch}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Variables Loading Indicator */}
                  {resolveLoading && (
                    <div className="flex items-center justify-center py-6 gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span className="text-[12px] text-slate-500">Resolving dynamic data…</span>
                    </div>
                  )}

                  {/* Variables Preview box */}
                  {Object.keys(resolvedVars).length > 0 && !resolveLoading && (
                    <div className="border border-slate-200/80 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="bg-slate-50/50 border-b border-slate-200/80 px-3.5 py-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600">Auto-filled Fields ({Object.keys(resolvedVars).length})</span>
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> Resolved
                        </span>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-[11.5px] p-1">
                        {Object.entries(resolvedVars).slice(0, 10).map(([k, val]) => (
                          <div key={k} className="flex justify-between py-1.5 px-2 hover:bg-slate-50/50">
                            <span className="font-mono text-indigo-600">{`{{${k}}}`}</span>
                            <span className="text-slate-800 font-semibold truncate max-w-[200px]">{val || <em className="text-slate-400">blank</em>}</span>
                          </div>
                        ))}
                        {Object.keys(resolvedVars).length > 10 && (
                          <div className="text-[10px] text-slate-400 text-center py-1 bg-slate-50/30">
                            + {Object.keys(resolvedVars).length - 10} more fields available in builder
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {resolveError && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11.5px] rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p>{resolveError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexShrink: 0 }}>
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer fontSize-[13px] font-bold text-[#475569] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !selectedCategoryId) return;
                if (step === 2 && !selectedTemplateId) return;
                setStep((s) => (s + 1) as Step);
              }}
              disabled={(step === 1 && !selectedCategoryId) || (step === 2 && !selectedTemplateId)}
              style={{
                padding: "9px 20px",
                borderRadius: 9,
                border: "none",
                background: (step === 1 && !selectedCategoryId) || (step === 2 && !selectedTemplateId) ? "#E2E8F0" : "#1E3A5F",
                color: (step === 1 && !selectedCategoryId) || (step === 2 && !selectedTemplateId) ? "#94A3B8" : "white",
                cursor: (step === 1 && !selectedCategoryId) || (step === 2 && !selectedTemplateId) ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s",
              }}
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={linkMode === "attach" && !selectedRecord}
              className="px-6 py-2.5 rounded-lg border-0 bg-[#1E3A5F] hover:bg-[#12253d] text-white cursor-pointer text-[13px] font-bold flex items-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              Open Builder →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
