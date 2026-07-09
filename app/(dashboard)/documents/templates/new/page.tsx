"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Users, Award, CreditCard, ClipboardList, BookOpen,
  Bell, Megaphone, FileText, File, ArrowLeft, ArrowRight, Check,
  Monitor, AlignJustify,
} from "lucide-react";
import { saveTemplate, getCategories } from "@/app/components/document-builder/store";
import type { TemplateMeta, PageSize, PageOrientation } from "@/app/components/document-builder/types";
import { useAuth } from "@/app/context/auth";

// ─── Category Icons ────────────────────────────────────────────────────────────
const CAT_ICONS: Record<string, React.ReactNode> = {
  student:     <GraduationCap size={26} />,
  teacher:     <Users size={26} />,
  certificate: <Award size={26} />,
  fees:        <CreditCard size={26} />,
  exam:        <ClipboardList size={26} />,
  report_card: <BookOpen size={26} />,
  circular:    <Bell size={26} />,
  notice:      <Megaphone size={26} />,
  letter:      <FileText size={26} />,
  blank:       <File size={26} />,
};

const CAT_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  student:     { bg: "#EFF6FF", accent: "#2563EB", text: "#1D4ED8" },
  teacher:     { bg: "#ECFDF5", accent: "#10B981", text: "#065F46" },
  certificate: { bg: "#FFFBEB", accent: "#F59E0B", text: "#92400E" },
  fees:        { bg: "#F5F3FF", accent: "#8B5CF6", text: "#5B21B6" },
  exam:        { bg: "#FFF1F2", accent: "#EF4444", text: "#991B1B" },
  report_card: { bg: "#EEF2FF", accent: "#6366F1", text: "#3730A3" },
  circular:    { bg: "#FFF7ED", accent: "#F97316", text: "#9A3412" },
  notice:      { bg: "#ECFEFF", accent: "#06B6D4", text: "#155E75" },
  letter:      { bg: "#EFF6FF", accent: "#3B82F6", text: "#1E40AF" },
  blank:       { bg: "#F8FAFC", accent: "#64748B", text: "#334155" },
};

// ─── Page size definitions ─────────────────────────────────────────────────────
const PAGE_SIZES: { id: PageSize; label: string; desc: string; wPx: number; hPx: number }[] = [
  { id: "A4",     label: "A4",     desc: "210 × 297 mm",  wPx: 794,  hPx: 1123 },
  { id: "Letter", label: "Letter", desc: "8.5 × 11 in",   wPx: 816,  hPx: 1056 },
  { id: "Legal",  label: "Legal",  desc: "8.5 × 14 in",   wPx: 816,  hPx: 1344 },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ["Category", "Page Setup", "Details"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const idx    = i + 1;
        const done   = step > idx;
        const active = step === idx;
        return (
          <React.Fragment key={label}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: done ? "#10B981" : active ? "#1E3A5F" : "#E2E8F0",
                color: done || active ? "white" : "#94A3B8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, transition: "all 0.2s",
              }}>
                {done ? <Check size={16} /> : idx}
              </div>
              <div style={{
                fontSize: 11, fontWeight: active ? 800 : 600,
                color: active ? "#1E3A5F" : done ? "#10B981" : "#94A3B8",
              }}>
                {label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                height: 2, width: 80, background: step > idx + 1 ? "#10B981" : step === idx + 1 ? "#1E3A5F" : "#E2E8F0",
                margin: "-18px 0 0",
                transition: "background 0.2s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function NewTemplatePage() {
  const router   = useRouter();
  const { user } = useAuth();
  const categories = getCategories();

  const [step,        setStep]        = useState(1);
  const [categoryId,  setCategoryId]  = useState("");
  const [pageSize,    setPageSize]    = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<PageOrientation>("portrait");
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [creating,    setCreating]    = useState(false);

  const handleCreate = () => {
    if (!name.trim() || !categoryId) return;
    setCreating(true);
    const now = new Date().toISOString();
    const tmpl: TemplateMeta = {
      id:          crypto.randomUUID(),
      name:        name.trim(),
      description: description.trim(),
      categoryId,
      pageSize,
      orientation,
      pages:       [{ id: crypto.randomUUID(), elements: [] }],
      status:      "draft",
      favourite:   false,
      thumbnail:   "",
      version:     "1.0",
      usageCount:  0,
      isBuiltIn:   false,
      createdBy:   user?.name || "Admin",
      updatedBy:   user?.name || "Admin",
      createdAt:   now,
      updatedAt:   now,
    };
    const saved = saveTemplate(tmpl);
    // Open builder in template mode
    router.push(`/documents/builder/template-${saved.id}?templateMode=true`);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#F0F4F8",
      fontFamily: "Roboto, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fade-up { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        input:focus { outline: none; }
        textarea:focus { outline: none; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "white", borderBottom: "1px solid #E2E8F0",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 14,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: 8, border: "1.5px solid #E2E8F0",
            background: "white", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B",
          }}
        >
          <ArrowLeft size={17} />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>Create New Template</div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>Set up your template — you can edit it fully in the builder</div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: 680, animation: "fade-up 0.3s ease-out" }}>
          <StepBar step={step} />

          {/* ── Step 1: Category ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                  Choose a Category
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
                  What type of document will this template be used for?
                </p>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 14,
              }}>
                {categories.map((cat) => {
                  const col     = CAT_COLORS[cat.id] ?? CAT_COLORS.blank;
                  const icon    = CAT_ICONS[cat.id] ?? <File size={26} />;
                  const active  = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        gap: 10, padding: "20px 12px", borderRadius: 14,
                        border: `2px solid ${active ? col.accent : "#E2E8F0"}`,
                        background: active ? col.bg : "white",
                        cursor: "pointer",
                        boxShadow: active ? `0 4px 16px ${col.accent}28` : "none",
                        transform: active ? "scale(1.03)" : "scale(1)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ color: active ? col.text : "#94A3B8" }}>{icon}</div>
                      <div style={{
                        fontSize: 12, fontWeight: 800,
                        color: active ? col.text : "#475569",
                      }}>
                        {cat.name}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
                <button
                  onClick={() => { if (categoryId) setStep(2); }}
                  disabled={!categoryId}
                  style={{
                    padding: "10px 28px", borderRadius: 10, fontSize: 14, fontWeight: 800,
                    background: categoryId ? "linear-gradient(135deg, #1E3A5F, #2563EB)" : "#E2E8F0",
                    color: categoryId ? "white" : "#94A3B8", border: "none",
                    cursor: categoryId ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: categoryId ? "0 4px 14px rgba(30,58,95,0.3)" : "none",
                  }}
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Page Setup ────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                  Page Setup
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
                  Choose the page size and orientation for your template
                </p>
              </div>

              {/* Page Size */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Page Size
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {PAGE_SIZES.map((ps) => {
                    const active = pageSize === ps.id;
                    const scaleW = 70;
                    const scaleH = Math.round(scaleW * (ps.hPx / ps.wPx));
                    return (
                      <button
                        key={ps.id}
                        onClick={() => setPageSize(ps.id)}
                        style={{
                          padding: "20px 16px", borderRadius: 12,
                          border: `2px solid ${active ? "#1E3A5F" : "#E2E8F0"}`,
                          background: active ? "#EFF6FF" : "white",
                          cursor: "pointer", textAlign: "center",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                          transition: "all 0.15s",
                          boxShadow: active ? "0 4px 16px rgba(30,58,95,0.15)" : "none",
                        }}
                      >
                        {/* Page shape preview */}
                        <div style={{
                          width: scaleW, height: scaleH,
                          border: `2px solid ${active ? "#1E3A5F" : "#CBD5E1"}`,
                          borderRadius: 3, background: "white",
                          boxShadow: "2px 2px 0 rgba(0,0,0,0.08)",
                        }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#1E3A5F" : "#0F172A" }}>{ps.label}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{ps.desc}</div>
                        </div>
                        {active && <Check size={16} style={{ color: "#1E3A5F" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Orientation */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Orientation
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {([
                    { id: "portrait",  label: "Portrait",  icon: <AlignJustify size={28} /> },
                    { id: "landscape", label: "Landscape", icon: <Monitor size={28} /> },
                  ] as { id: PageOrientation; label: string; icon: React.ReactNode }[]).map((o) => {
                    const active = orientation === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setOrientation(o.id)}
                        style={{
                          padding: "20px 24px", borderRadius: 12,
                          border: `2px solid ${active ? "#1E3A5F" : "#E2E8F0"}`,
                          background: active ? "#EFF6FF" : "white",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 16,
                          transition: "all 0.15s",
                          boxShadow: active ? "0 4px 16px rgba(30,58,95,0.15)" : "none",
                        }}
                      >
                        <div style={{ color: active ? "#1E3A5F" : "#94A3B8" }}>{o.icon}</div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: active ? "#1E3A5F" : "#0F172A" }}>{o.label}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8" }}>
                            {o.id === "portrait" ? "Taller than wide" : "Wider than tall"}
                          </div>
                        </div>
                        {active && <Check size={16} style={{ color: "#1E3A5F", marginLeft: "auto" }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: "1.5px solid #E2E8F0", background: "white", color: "#64748B",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  style={{
                    padding: "10px 28px", borderRadius: 10, fontSize: 14, fontWeight: 800,
                    background: "linear-gradient(135deg, #1E3A5F, #2563EB)",
                    color: "white", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    boxShadow: "0 4px 14px rgba(30,58,95,0.3)",
                  }}
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Name & Description ───────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                  Template Details
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>
                  Give your template a name so it's easy to find later
                </p>
              </div>

              <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #E2E8F0", padding: 28 }}>
                {/* Summary */}
                <div style={{
                  background: "#F8FAFC", borderRadius: 10, padding: "14px 18px",
                  marginBottom: 24, display: "flex", gap: 20, flexWrap: "wrap",
                }}>
                  {[
                    { label: "Category", value: categories.find((c) => c.id === categoryId)?.name ?? categoryId },
                    { label: "Page Size", value: pageSize },
                    { label: "Orientation", value: orientation.charAt(0).toUpperCase() + orientation.slice(1) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                    Template Name *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Bonafide Certificate — Classic"
                    autoFocus
                    maxLength={80}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 8,
                      border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0F172A",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#1E3A5F"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                  />
                  <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 4 }}>
                    {name.length}/80
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                    Description <span style={{ fontWeight: 400, color: "#94A3B8" }}>(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe what this template is for…"
                    maxLength={300}
                    rows={3}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: 8,
                      border: "1.5px solid #E2E8F0", fontSize: 13, color: "#0F172A",
                      resize: "vertical", fontFamily: "Roboto, sans-serif",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#1E3A5F"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
                  />
                  <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 4 }}>
                    {description.length}/300
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: "1.5px solid #E2E8F0", background: "white", color: "#64748B",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim() || creating}
                  style={{
                    padding: "11px 32px", borderRadius: 10, fontSize: 14, fontWeight: 800,
                    background: name.trim() ? "linear-gradient(135deg, #1E3A5F, #2563EB)" : "#E2E8F0",
                    color: name.trim() ? "white" : "#94A3B8",
                    border: "none", cursor: name.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 8,
                    boxShadow: name.trim() ? "0 4px 14px rgba(30,58,95,0.3)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {creating ? "Opening Builder…" : "Create & Open Builder →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
