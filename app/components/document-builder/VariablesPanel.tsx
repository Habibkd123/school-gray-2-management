"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Search, Star, Clock, Plus, Trash2, X, ChevronDown, ChevronRight,
  Sparkles, Check,
} from "lucide-react";
import {
  VARIABLE_CATEGORIES,
  type VariableDefinition,
  type VariableCategory,
} from "./variable-definitions";
import {
  getCustomVariables, saveCustomVariable, deleteCustomVariable,
  customToDefinition, getFavourites, toggleVariableFavourite,
  getRecents, recordRecentVariable, type CustomVariable,
} from "./variable-store";
import type { DocumentElement, VariableMeta } from "./types";
import { DEFAULT_TEXT_STYLE } from "./types";

// ─── Props ────────────────────────────────────────────────────────────────────
interface VariablesPanelProps {
  onInsert: (element: Omit<DocumentElement, "id" | "x" | "y" | "zIndex">) => void;
  onClose: () => void;
}

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT_BADGE: Record<string, { bg: string; color: string }> = {
  student:    { bg: "#DBEAFE", color: "#1D4ED8" },
  parent:     { bg: "#CFFAFE", color: "#0E7490" },
  teacher:    { bg: "#D1FAE5", color: "#065F46" },
  school:     { bg: "#EDE9FE", color: "#5B21B6" },
  academic:   { bg: "#FEF3C7", color: "#92400E" },
  exam:       { bg: "#FEE2E2", color: "#991B1B" },
  attendance: { bg: "#E0F2FE", color: "#075985" },
  fees:       { bg: "#F3E8FF", color: "#6D28D9" },
  salary:     { bg: "#D1FAE5", color: "#064E3B" },
  system:     { bg: "#F1F5F9", color: "#334155" },
  custom:     { bg: "#FFF7ED", color: "#9A3412" },
};

// ─── Variable Chip (draggable) ────────────────────────────────────────────────
function VariableChip({
  variable, isFav, onInsert, onFavToggle, onDragStart,
}: {
  variable: VariableDefinition;
  isFav: boolean;
  onInsert: (v: VariableDefinition) => void;
  onFavToggle: (key: string) => void;
  onDragStart: (v: VariableDefinition) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const badge = CAT_BADGE[variable.categoryId] ?? CAT_BADGE.custom;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(variable)}
      onDoubleClick={() => onInsert(variable)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Double-click or drag to insert\n${variable.description}`}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 10px", borderRadius: 8, cursor: "grab",
        background: hovered ? badge.bg : "#F8FAFC",
        border: `1.5px solid ${hovered ? badge.color + "40" : "#E8EDF3"}`,
        transition: "all 0.12s", userSelect: "none",
        gap: 6,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
          {variable.label}
        </div>
        <div style={{
          fontSize: 10, color: badge.color, fontFamily: "monospace",
          fontWeight: 600, marginTop: 1, letterSpacing: 0.2,
        }}>
          {`{{${variable.key}}}`}
        </div>
      </div>
      {/* Fav toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onFavToggle(variable.key); }}
        style={{
          border: "none", background: "none", cursor: "pointer", padding: 2, flexShrink: 0,
          color: isFav ? "#F59E0B" : "#CBD5E1", transition: "color 0.12s",
        }}
      >
        <Star size={12} fill={isFav ? "#F59E0B" : "none"} />
      </button>
    </div>
  );
}

// ─── Custom Variable Form ─────────────────────────────────────────────────────
function CustomVarForm({ onSave, onCancel }: {
  onSave: (v: Omit<CustomVariable, "key" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}) {
  const [label, setLabel]         = useState("");
  const [description, setDesc]    = useState("");
  const [previewValue, setPreview] = useState("");
  const canSave = label.trim().length > 0;

  return (
    <div style={{
      background: "#FAFBFF", border: "1.5px solid #C7D2FE",
      borderRadius: 10, padding: "12px 12px", margin: "8px 0",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#3730A3", marginBottom: 8, letterSpacing: 0.3 }}>
        ✨ NEW CUSTOM VARIABLE
      </div>
      {[
        { label: "Name *",         value: label,        set: setLabel,   ph: "e.g. School Motto" },
        { label: "Preview Value",  value: previewValue, set: setPreview, ph: "e.g. Educating For Life" },
        { label: "Description",    value: description,  set: setDesc,    ph: "What this variable represents" },
      ].map(({ label: l, value, set, ph }) => (
        <div key={l} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 3 }}>{l}</div>
          <input
            value={value}
            onChange={(e) => set(e.target.value)}
            placeholder={ph}
            style={{
              width: "100%", padding: "6px 9px", borderRadius: 6,
              border: "1.5px solid #E2E8F0", fontSize: 12, outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#6366F1"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
          />
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "6px", borderRadius: 6, border: "1.5px solid #E2E8F0",
          background: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#64748B",
        }}>Cancel</button>
        <button
          onClick={() => {
            if (canSave) onSave({ label: label.trim(), description: description.trim(), previewValue: previewValue.trim() || label.trim() });
          }}
          disabled={!canSave}
          style={{
            flex: 2, padding: "6px", borderRadius: 6, border: "none",
            background: canSave ? "#4F46E5" : "#E2E8F0",
            fontSize: 11, fontWeight: 800, cursor: canSave ? "pointer" : "not-allowed",
            color: canSave ? "white" : "#94A3B8",
          }}
        >
          <Check size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
          Save Variable
        </button>
      </div>
    </div>
  );
}

// ─── Category section (collapsible) ──────────────────────────────────────────
function CategorySection({
  category, vars, favKeys, search, onInsert, onFavToggle, onDragStart,
}: {
  category: VariableCategory;
  vars: VariableDefinition[];
  favKeys: Set<string>;
  search: string;
  onInsert: (v: VariableDefinition) => void;
  onFavToggle: (key: string) => void;
  onDragStart: (v: VariableDefinition) => void;
}) {
  const [open, setOpen] = useState(false);
  const badge = CAT_BADGE[category.id] ?? CAT_BADGE.custom;

  // Auto-open when searching
  useEffect(() => {
    if (search && vars.length > 0) setOpen(true);
  }, [search, vars.length]);

  if (vars.length === 0) return null;

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "7px 10px", borderRadius: 8, border: "none",
          background: open ? badge.bg : "transparent", cursor: "pointer",
          transition: "all 0.12s",
        }}
      >
        <span style={{ fontSize: 14 }}>{category.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: open ? badge.color : "#475569", flex: 1, textAlign: "left" }}>
          {category.label}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
          background: badge.bg, color: badge.color,
        }}>
          {vars.length}
        </span>
        {open ? <ChevronDown size={13} style={{ color: "#94A3B8" }} /> : <ChevronRight size={13} style={{ color: "#CBD5E1" }} />}
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 0 4px 4px" }}>
          {vars.map((v) => (
            <VariableChip
              key={v.key}
              variable={v}
              isFav={favKeys.has(v.key)}
              onInsert={onInsert}
              onFavToggle={onFavToggle}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Variables Panel ─────────────────────────────────────────────────────
export function VariablesPanel({ onInsert, onClose }: VariablesPanelProps) {
  const [search,      setSearch]      = useState("");
  const [favKeys,     setFavKeys]     = useState<Set<string>>(() => new Set(getFavourites()));
  const [recentKeys,  setRecentKeys]  = useState<string[]>(() => getRecents());
  const [customVars,  setCustomVars]  = useState<CustomVariable[]>(() => getCustomVariables());
  const [showForm,    setShowForm]    = useState(false);
  const [inserted,    setInserted]    = useState<string | null>(null); // brief flash
  const [activeTab,   setActiveTab]   = useState<"all" | "favourites" | "recent" | "custom">("all");

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // ── Build variable definition for each category, filtered by search ────────
  const q = search.toLowerCase().trim();
  const allBuiltIn: VariableDefinition[] = VARIABLE_CATEGORIES.flatMap((c) => c.variables);
  const allCustomDefs   = customVars.map(customToDefinition);
  const allDefs         = [...allBuiltIn, ...allCustomDefs];

  const filtered = q
    ? allDefs.filter((v) =>
        v.label.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
      )
    : allDefs;

  const favouriteDefs = allDefs.filter((v) => favKeys.has(v.key));
  const recentDefs    = recentKeys.map((k) => allDefs.find((v) => v.key === k)).filter(Boolean) as VariableDefinition[];

  // ── Insert a variable element ──────────────────────────────────────────────
  const handleInsert = useCallback((v: VariableDefinition) => {
    const meta: VariableMeta = {
      key:          v.key,
      label:        v.label,
      category:     v.category,
      categoryId:   v.categoryId,
      previewValue: v.previewValue,
      description:  v.description,
    };
    onInsert({
      type: "variable",
      width: Math.max(160, v.label.length * 9 + 32),
      height: 34,
      content: `{{${v.key}}}`,
      variableMeta: meta,
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, color: "#1D4ED8" },
    });
    // Track recent
    recordRecentVariable(v.key);
    setRecentKeys(getRecents());
    // Brief inserted flash
    setInserted(v.key);
    setTimeout(() => setInserted(null), 1200);
  }, [onInsert]);

  const handleFavToggle = useCallback((key: string) => {
    const updated = toggleVariableFavourite(key);
    setFavKeys(new Set(updated));
  }, []);

  const handleDragStart = useCallback((v: VariableDefinition) => {
    // Store in dataTransfer via a global ref (Canvas.tsx reads it on drop)
    window.__draggedVariable = v;
  }, []);

  const handleCustomSave = (data: Omit<CustomVariable, "key" | "createdAt" | "updatedAt">) => {
    saveCustomVariable(data);
    setCustomVars(getCustomVariables());
    setShowForm(false);
  };

  const handleCustomDelete = (key: string) => {
    deleteCustomVariable(key);
    setCustomVars(getCustomVariables());
  };

  // ── Tab content ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (activeTab === "favourites") {
      return favouriteDefs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {favouriteDefs.map((v) => (
            <VariableChip key={v.key} variable={v} isFav={true}
              onInsert={handleInsert} onFavToggle={handleFavToggle} onDragStart={handleDragStart} />
          ))}
        </div>
      ) : (
        <EmptyState icon="⭐" message="No favourites yet" sub="Click the star on any variable to add it here." />
      );
    }

    if (activeTab === "recent") {
      return recentDefs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {recentDefs.map((v) => (
            <VariableChip key={v.key} variable={v} isFav={favKeys.has(v.key)}
              onInsert={handleInsert} onFavToggle={handleFavToggle} onDragStart={handleDragStart} />
          ))}
        </div>
      ) : (
        <EmptyState icon="🕐" message="No recent variables" sub="Variables you insert will appear here." />
      );
    }

    if (activeTab === "custom") {
      const customDefs = customVars.map(customToDefinition);
      return (
        <div>
          {showForm ? (
            <CustomVarForm onSave={handleCustomSave} onCancel={() => setShowForm(false)} />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                width: "100%", padding: "8px 10px", borderRadius: 8,
                border: "1.5px dashed #C7D2FE", background: "#FAFBFF",
                cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#4F46E5",
                marginBottom: 8,
              }}
            >
              <Plus size={14} /> Create Custom Variable
            </button>
          )}
          {customDefs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {customDefs.map((v) => (
                <div key={v.key} style={{ display: "flex", gap: 4 }}>
                  <div style={{ flex: 1 }}>
                    <VariableChip variable={v} isFav={favKeys.has(v.key)}
                      onInsert={handleInsert} onFavToggle={handleFavToggle} onDragStart={handleDragStart} />
                  </div>
                  <button
                    onClick={() => handleCustomDelete(v.key)}
                    title="Delete custom variable"
                    style={{
                      width: 28, height: "auto", borderRadius: 6, border: "1.5px solid #FEE2E2",
                      background: "#FEF2F2", cursor: "pointer", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Trash2 size={11} style={{ color: "#DC2626" }} />
                  </button>
                </div>
              ))}
            </div>
          ) : !showForm && (
            <EmptyState icon="✏️" message="No custom variables" sub="Create variables specific to your school." />
          )}
        </div>
      );
    }

    // "all" tab
    if (q) {
      // Flat search results
      return filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((v) => (
            <VariableChip key={v.key} variable={v} isFav={favKeys.has(v.key)}
              onInsert={handleInsert} onFavToggle={handleFavToggle} onDragStart={handleDragStart} />
          ))}
        </div>
      ) : (
        <EmptyState icon="🔍" message="No variables match" sub={`No results for "${q}"`} />
      );
    }

    // Category tree
    const customCategory: VariableCategory = {
      id: "custom", label: "Custom", icon: "✏️", color: "#EA580C",
      variables: customVars.map(customToDefinition),
    };
    const allCategories = [...VARIABLE_CATEGORIES, customCategory];

    return (
      <div>
        {allCategories.map((cat) => {
          const vars = cat.variables; // no filter in "all" tab without search
          return (
            <CategorySection
              key={cat.id}
              category={cat}
              vars={vars}
              favKeys={favKeys}
              search={q}
              onInsert={handleInsert}
              onFavToggle={handleFavToggle}
              onDragStart={handleDragStart}
            />
          );
        })}
      </div>
    );
  };

  const tabs: { id: "all" | "favourites" | "recent" | "custom"; icon: React.ReactNode; label: string }[] = [
    { id: "all",        icon: <Sparkles size={12} />, label: "All"       },
    { id: "favourites", icon: <Star size={12} />,     label: "Starred"   },
    { id: "recent",     icon: <Clock size={12} />,    label: "Recent"    },
    { id: "custom",     icon: <Plus size={12} />,     label: "Custom"    },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: "calc(100% + 6px)",
        top: 0,
        width: 280,
        maxHeight: "calc(100vh - 60px)",
        background: "white",
        borderRadius: 14,
        boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        border: "1.5px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1000,
        animation: "vars-in 0.15s ease-out",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes vars-in { from { opacity:0; transform:translateX(-6px) scale(0.97); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
        input:focus { outline: none; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "12px 12px 8px",
        borderBottom: "1px solid #F1F5F9",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={12} style={{ color: "white" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#0F172A" }}>Variables</span>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", padding: 2 }}>
            <X size={15} />
          </button>
        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "#F8FAFC", border: "1.5px solid #E2E8F0",
          borderRadius: 8, padding: "0 10px",
        }}>
          <Search size={13} style={{ color: "#94A3B8", flexShrink: 0 }} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value) setActiveTab("all"); }}
            placeholder="Search variables…"
            style={{
              border: "none", background: "transparent",
              padding: "7px 0", fontSize: 12.5, flex: 1, color: "#0F172A",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", padding: "6px 8px", gap: 4,
        borderBottom: "1px solid #F1F5F9", flexShrink: 0,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 4, padding: "5px 4px", borderRadius: 7, border: "none",
              background: activeTab === tab.id ? "#EEF2FF" : "transparent",
              color: activeTab === tab.id ? "#4F46E5" : "#64748B",
              fontSize: 10.5, fontWeight: activeTab === tab.id ? 800 : 600,
              cursor: "pointer", transition: "all 0.12s",
            }}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px", scrollbarWidth: "thin" }}>
        {renderTabContent()}
      </div>

      {/* Footer tip */}
      <div style={{
        padding: "7px 12px", background: "#F8FAFC",
        borderTop: "1px solid #F1F5F9", flexShrink: 0,
        fontSize: 10, color: "#94A3B8", lineHeight: 1.4,
      }}>
        💡 Double-click or drag a variable onto the canvas to insert it
      </div>

      {/* Inserted flash */}
      {inserted && (
        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          background: "#10B981", color: "white", fontSize: 11, fontWeight: 700,
          padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap",
          animation: "vars-in 0.15s ease-out",
          pointerEvents: "none",
        }}>
          <Check size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
          Inserted!
        </div>
      )}
    </div>
  );
}

// ─── Empty state helper ───────────────────────────────────────────────────────
function EmptyState({ icon, message, sub }: { icon: string; message: string; sub: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "28px 16px", gap: 8,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>{message}</div>
      <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

// ─── Global drag variable ref (picked up by Canvas drop handler) ──────────────
declare global {
  interface Window {
    __draggedVariable?: VariableDefinition;
  }
}
