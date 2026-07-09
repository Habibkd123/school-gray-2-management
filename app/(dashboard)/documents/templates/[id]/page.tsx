"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Copy, Trash2, Download, Star,
  FileText, Calendar, User, Layers, RotateCw, Check,
  LayoutTemplate, X,
} from "lucide-react";
import {
  getTemplate, deleteTemplate, duplicateTemplate, toggleFavourite,
  exportTemplate, useTemplate, restoreTemplate,
} from "@/app/components/document-builder/store";
import type { TemplateMeta } from "@/app/components/document-builder/types";
import { useAuth } from "@/app/context/auth";

// ─── Use Template Modal ───────────────────────────────────────────────────────
function UseModal({ template, onClose, onConfirm }: {
  template: TemplateMeta;
  onClose: () => void;
  onConfirm: (title: string) => void;
}) {
  const [title, setTitle] = useState(`${template.name} — ${new Date().toLocaleDateString()}`);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 32, width: 440,
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>Use Template</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Create a new document from "{template.name}"</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={18} />
          </button>
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
          Document Title *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title…"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) onConfirm(title.trim()); }}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8,
            border: "1.5px solid #E2E8F0", fontSize: 14, outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#1E3A5F"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 8, border: "1.5px solid #E2E8F0",
            background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#64748B",
          }}>
            Cancel
          </button>
          <button
            onClick={() => { if (title.trim()) onConfirm(title.trim()); }}
            disabled={!title.trim()}
            style={{
              padding: "9px 22px", borderRadius: 8, border: "none",
              background: title.trim() ? "#1E3A5F" : "#CBD5E1",
              color: "white", fontSize: 13, fontWeight: 700,
              cursor: title.trim() ? "pointer" : "not-allowed",
            }}
          >
            Open in Builder →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Large Page Preview ───────────────────────────────────────────────────────
function LargePreview({ template }: { template: TemplateMeta }) {
  const isPortrait = template.orientation === "portrait";
  const catColors: Record<string, string> = {
    student:     "linear-gradient(135deg,#1E3A5F,#2563EB)",
    teacher:     "linear-gradient(135deg,#065F46,#10B981)",
    certificate: "linear-gradient(135deg,#78350F,#F59E0B)",
    fees:        "linear-gradient(135deg,#4C1D95,#8B5CF6)",
    exam:        "linear-gradient(135deg,#7F1D1D,#EF4444)",
    report_card: "linear-gradient(135deg,#1E1B4B,#6366F1)",
    circular:    "linear-gradient(135deg,#7C2D12,#F97316)",
    notice:      "linear-gradient(135deg,#164E63,#06B6D4)",
    letter:      "linear-gradient(135deg,#1E3A5F,#3B82F6)",
    blank:       "linear-gradient(135deg,#1E293B,#475569)",
  };
  const bg      = catColors[template.categoryId] ?? catColors.blank;
  const elCount = template.pages[0]?.elements.length ?? 0;
  const W = isPortrait ? 200 : 280;
  const H = isPortrait ? 280 : 200;

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      padding: 40, background: "linear-gradient(135deg, #F0F4F8, #E8EDF3)",
      borderRadius: 16, minHeight: 380,
    }}>
      <div style={{
        width: W, height: H, borderRadius: 8, overflow: "hidden",
        background: bg, position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15)",
      }}>
        {/* White page area */}
        <div style={{
          position: "absolute", inset: "12px 14px", background: "white",
          borderRadius: 4, overflow: "hidden",
        }}>
          {/* Sketch lines */}
          {Array.from({ length: Math.min(elCount + 3, 14) }).map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: "6%", right: i % 3 === 0 ? "6%" : i % 3 === 1 ? "25%" : "12%",
              top: `${8 + i * 6.5}%`,
              height: i === 0 ? 6 : i < 3 ? 3.5 : 2,
              background: i === 0 ? "#1E3A5F" : i < 3 ? "#94A3B8" : "#E2E8F0",
              borderRadius: 2,
            }} />
          ))}
          {/* Table hint lines */}
          {template.pages[0]?.elements.some((e) => e.type === "table") && (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`row-${i}`} style={{
                position: "absolute", left: "6%", right: "6%",
                top: `${55 + i * 9}%`, height: 1,
                background: "#E2E8F0",
              }} />
            ))
          )}
        </div>
        {/* Page label */}
        <div style={{
          position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
          fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.7)",
          background: "rgba(0,0,0,0.25)", padding: "2px 10px", borderRadius: 10,
          letterSpacing: 0.5, whiteSpace: "nowrap",
        }}>
          {template.pageSize} · {template.orientation === "portrait" ? "Portrait" : "Landscape"} · Page 1 of {template.pages.length}
        </div>
      </div>
    </div>
  );
}

// ─── Meta Item ────────────────────────────────────────────────────────────────
function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ color: "#94A3B8", marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TemplatePreviewPage() {
  const { id }     = useParams<{ id: string }>();
  const router     = useRouter();
  const { user }   = useAuth();

  const [template,  setTemplate]  = useState<TemplateMeta | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [useModal,  setUseModal]  = useState(false);
  const [toastMsg,  setToastMsg]  = useState<string | null>(null);

  useEffect(() => {
    const t = getTemplate(id);
    setTemplate(t);
    setLoading(false);
  }, [id]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleDuplicate = () => {
    if (!template) return;
    const copy = duplicateTemplate(template.id);
    if (copy) { showToast(`"${copy.name}" created`); router.push(`/documents/templates/${copy.id}`); }
  };

  const handleFav = () => {
    if (!template) return;
    const updated = toggleFavourite(template.id);
    if (updated) setTemplate(updated);
  };

  const handleExport = () => {
    if (!template) return;
    const json = exportTemplate(template.id);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${template.name.replace(/[^a-z0-9]/gi, "_")}.template.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported");
  };

  const handleDelete = () => {
    if (!template) return;
    deleteTemplate(template.id);
    router.push("/documents/templates");
  };

  const handleRestore = () => {
    if (!template) return;
    restoreTemplate(template.id);
    setTemplate({ ...template, deletedAt: undefined });
    showToast("Restored");
  };

  const handleUse = (title: string) => {
    if (!template) return;
    const doc = useTemplate(template, title, user?.name || "Admin");
    router.push(`/documents/builder/${doc.id}`);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "#94A3B8" }}>Loading…</div>
    </div>
  );

  if (!template) return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <LayoutTemplate size={40} style={{ color: "#CBD5E1" }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: "#475569" }}>Template not found</div>
      <button onClick={() => router.push("/documents/templates")} style={{ fontSize: 13, color: "#1E3A5F", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>
        ← Back to Templates
      </button>
    </div>
  );

  const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
    published: { bg: "#DCFCE7", color: "#166534" },
    draft:     { bg: "#FEF9C3", color: "#854D0E" },
    archived:  { bg: "#F1F5F9", color: "#64748B" },
  };
  const ss = STATUS_STYLES[template.status] ?? STATUS_STYLES.draft;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8", fontFamily: "Roboto, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes ftbar-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        input:focus { outline: none; }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "white", borderBottom: "1px solid #E2E8F0",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <button
          onClick={() => router.push("/documents/templates")}
          style={{
            width: 36, height: 36, borderRadius: 8, border: "1.5px solid #E2E8F0",
            background: "white", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B",
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>
            Dashboard / Documents / Templates / Preview
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "#0F172A", margin: 0 }}>
              {template.name}
            </h1>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px",
              borderRadius: 20, background: ss.bg, color: ss.color,
            }}>
              {template.status.charAt(0).toUpperCase() + template.status.slice(1)}
            </span>
            {template.isBuiltIn && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "3px 10px",
                borderRadius: 20, background: "#EFF6FF", color: "#1D4ED8", letterSpacing: 0.3,
              }}>
                BUILT-IN
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {template.deletedAt ? (
            <>
              <button onClick={handleRestore} style={{
                padding: "8px 16px", borderRadius: 8, border: "1.5px solid #E2E8F0",
                background: "white", color: "#64748B", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <RotateCw size={13} /> Restore
              </button>
              <button onClick={handleDelete} style={{
                padding: "8px 16px", borderRadius: 8, border: "1.5px solid #FECACA",
                background: "#FEF2F2", color: "#DC2626", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <Trash2 size={13} /> Delete Permanently
              </button>
            </>
          ) : (
            <>
              <button onClick={handleFav} style={{
                width: 36, height: 36, borderRadius: 8, border: "1.5px solid #E2E8F0",
                background: template.favourite ? "#FFFBEB" : "white", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: template.favourite ? "#D97706" : "#94A3B8",
              }} title={template.favourite ? "Remove from favourites" : "Add to favourites"}>
                <Star size={15} fill={template.favourite ? "#D97706" : "none"} />
              </button>
              <button onClick={handleExport} style={{
                padding: "8px 16px", borderRadius: 8, border: "1.5px solid #E2E8F0",
                background: "white", color: "#64748B", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <Download size={13} /> Export
              </button>
              <button onClick={handleDuplicate} style={{
                padding: "8px 16px", borderRadius: 8, border: "1.5px solid #E2E8F0",
                background: "white", color: "#64748B", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <Copy size={13} /> Duplicate
              </button>
              {!template.isBuiltIn && (
                <>
                  <button
                    onClick={() => router.push(`/documents/builder/template-${template.id}?templateMode=true`)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: "1.5px solid #E2E8F0",
                      background: "white", color: "#475569", fontSize: 12.5, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={handleDelete} style={{
                    width: 36, height: 36, borderRadius: 8, border: "1.5px solid #FECACA",
                    background: "#FEF2F2", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#DC2626",
                  }} title="Delete template">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => setUseModal(true)}
                style={{
                  padding: "9px 22px", borderRadius: 8, fontSize: 13, fontWeight: 800,
                  background: "linear-gradient(135deg, #1E3A5F, #2563EB)",
                  color: "white", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 4px 14px rgba(30,58,95,0.28)",
                }}
              >
                <Check size={14} /> Use Template
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 73px)" }}>
        {/* Preview panel */}
        <div style={{ flex: 1, padding: 32, minWidth: 0 }}>
          {template.deletedAt && (
            <div style={{
              background: "#FEF2F2", border: "1.5px solid #FECACA",
              borderRadius: 10, padding: "10px 16px", marginBottom: 20,
              fontSize: 13, color: "#DC2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Trash2 size={14} /> This template is in the Trash. Restore it to use or edit.
            </div>
          )}

          <LargePreview template={template} />

          {/* Description */}
          {template.description && (
            <div style={{ marginTop: 20, padding: "16px 20px", background: "white", borderRadius: 12, border: "1.5px solid #E8EDF3" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>Description</div>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{template.description}</p>
            </div>
          )}

          {/* Pages preview (page count badges) */}
          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {template.pages.map((_, i) => (
              <div key={i} style={{
                width: 56, height: 72, borderRadius: 6,
                border: i === 0 ? "2px solid #1E3A5F" : "1.5px solid #E2E8F0",
                background: i === 0 ? "#EFF6FF" : "#F8FAFC",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, cursor: "pointer",
              }}>
                <FileText size={16} style={{ color: i === 0 ? "#1E3A5F" : "#CBD5E1" }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? "#1E3A5F" : "#94A3B8" }}>
                  Pg {i + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meta sidebar */}
        <div style={{
          width: 280, flexShrink: 0, background: "white",
          borderLeft: "1px solid #E2E8F0", padding: "28px 24px",
          overflowY: "auto",
        }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#0F172A", marginBottom: 16 }}>Template Info</div>

          <MetaItem icon={<Layers size={14} />}   label="Category"    value={template.categoryId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />
          <MetaItem icon={<FileText size={14} />} label="Page Size"   value={`${template.pageSize} · ${template.orientation === "portrait" ? "Portrait" : "Landscape"}`} />
          <MetaItem icon={<FileText size={14} />} label="Pages"       value={`${template.pages.length} page${template.pages.length !== 1 ? "s" : ""}`} />
          <MetaItem icon={<FileText size={14} />} label="Version"     value={`v${template.version}`} />
          <MetaItem icon={<RotateCw size={14} />} label="Usage"       value={`${template.usageCount || 0} time${template.usageCount !== 1 ? "s" : ""}`} />
          <MetaItem icon={<User size={14} />}     label="Created By"  value={template.createdBy} />
          <MetaItem icon={<User size={14} />}     label="Updated By"  value={template.updatedBy} />
          <MetaItem icon={<Calendar size={14} />} label="Created"     value={new Date(template.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
          <MetaItem icon={<Calendar size={14} />} label="Last Updated" value={new Date(template.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />

          {!template.deletedAt && (
            <button
              onClick={() => setUseModal(true)}
              style={{
                marginTop: 24, width: "100%", padding: "12px",
                borderRadius: 10, background: "linear-gradient(135deg, #1E3A5F, #2563EB)",
                color: "white", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 800, display: "flex",
                alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 14px rgba(30,58,95,0.28)",
              }}
            >
              <Check size={15} /> Use Template
            </button>
          )}
        </div>
      </div>

      {/* Use modal */}
      {useModal && (
        <UseModal
          template={template}
          onClose={() => setUseModal(false)}
          onConfirm={(title) => { handleUse(title); setUseModal(false); }}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: "#0F2336", color: "white", padding: "12px 20px",
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "ftbar-in 0.2s ease-out",
        }}>
          <Check size={14} /> {toastMsg}
        </div>
      )}
    </div>
  );
}
