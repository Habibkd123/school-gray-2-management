"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Grid3X3, List, Star, Filter, SlidersHorizontal,
  MoreVertical, Eye, Pencil, Copy, Trash2, Download, Upload,
  ChevronLeft, ChevronRight, LayoutTemplate, Heart, HeartOff,
  RotateCcw, Check, X, FileText,
} from "lucide-react";
import {
  getTemplates, deleteTemplate, restoreTemplate, hardDeleteTemplate,
  duplicateTemplate, toggleFavourite, exportTemplate, importTemplate,
  useTemplate, getCategories,
} from "@/app/components/document-builder/store";
import type { TemplateMeta } from "@/app/components/document-builder/types";
import { useAuth } from "@/app/context/auth";

// ── Live Canvas Thumbnail ─────────────────────────────────────────────────────
function MiniElement({ element: el }: { element: any }) {
  const ts = el.textStyle || {};
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x, top: el.y, width: el.width, height: el.height,
  };
  
  if (el.type === "heading" || el.type === "subheading" || el.type === "paragraph") {
    return (
      <div
        style={{
          ...baseStyle,
          fontFamily: ts.fontFamily, fontSize: ts.fontSize, fontWeight: ts.fontWeight,
          fontStyle: ts.fontStyle, textDecoration: ts.textDecoration, textAlign: ts.textAlign,
          color: ts.color, backgroundColor: ts.backgroundColor === "transparent" ? undefined : ts.backgroundColor,
          letterSpacing: ts.letterSpacing, lineHeight: ts.lineHeight,
          padding: `${ts.paddingTop || 0}px ${ts.paddingRight || 0}px ${ts.paddingBottom || 0}px ${ts.paddingLeft || 0}px`,
          borderRadius: ts.borderRadius,
          border: ts.borderWidth ? `${ts.borderWidth}px solid ${ts.borderColor}` : undefined,
          wordBreak: "break-word", whiteSpace: "pre-wrap", overflow: "hidden", boxSizing: "border-box",
        }}
        dangerouslySetInnerHTML={{ __html: el.content || "" }}
      />
    );
  }

  if (el.type === "variable") {
    return (
      <div style={{
        ...baseStyle,
        fontFamily: ts.fontFamily, fontSize: ts.fontSize, fontWeight: ts.fontWeight,
        fontStyle: ts.fontStyle, textDecoration: ts.textDecoration, textAlign: ts.textAlign,
        color: ts.color, backgroundColor: ts.backgroundColor === "transparent" ? undefined : ts.backgroundColor,
        letterSpacing: ts.letterSpacing, lineHeight: ts.lineHeight,
        padding: `${ts.paddingTop || 0}px ${ts.paddingRight || 0}px ${ts.paddingBottom || 0}px ${ts.paddingLeft || 0}px`,
        borderRadius: ts.borderRadius,
        border: ts.borderWidth ? `${ts.borderWidth}px solid ${ts.borderColor}` : undefined,
        wordBreak: "break-word", whiteSpace: "pre-wrap", overflow: "hidden", boxSizing: "border-box",
        display: "flex", alignItems: "flex-start",
      }}>
        {el.variableMeta?.previewValue || `{{${el.variableMeta?.key || ""}}}`}
      </div>
    );
  }
  
  if (el.type === "image" || el.type === "logo") {
    return (
      <div style={{ ...baseStyle, ...(el.imageStyle || {}), background: "#F1F5F9", overflow: "hidden" }}>
        {el.content && <img src={el.content} alt="" style={{ width: "100%", height: "100%", objectFit: el.imageStyle?.objectFit || "contain" }} />}
      </div>
    );
  }

  if (el.type === "table" && el.tableData) {
     return (
       <div style={{ ...baseStyle, overflow: "hidden" }}>
         <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 }}>
           <tbody>
             {el.tableData.cells.map((row: any[], r: number) => {
               const isHeader = el.tableData.headerRow && r === 0;
               return (
                 <tr key={r}>
                   {row.map((cell: any, c: number) => (
                     <td key={c} style={{
                       border: el.tableData.borderWidth ? `${el.tableData.borderWidth}px solid ${el.tableData.borderColor}` : undefined,
                       padding: el.tableData.cellPadding,
                       fontWeight: isHeader ? "bold" : "normal",
                       backgroundColor: isHeader ? "#F8FAFC" : "transparent",
                       verticalAlign: "middle",
                       wordBreak: "break-word",
                     }}>
                       {cell}
                     </td>
                   ))}
                 </tr>
               )
             })}
           </tbody>
         </table>
       </div>
     )
  }

  if (el.type === "divider" || el.type === "horizontalLine") {
     return <div style={{ ...baseStyle, borderTop: "2px solid #000" }} />
  }

  if (el.type === "shape") {
     const isCircle = el.shapeVariant === "circle";
     return <div style={{ ...baseStyle, background: ts.backgroundColor || "#CBD5E1", borderRadius: isCircle ? "50%" : 0 }} />
  }

  return <div style={{ ...baseStyle, background: "rgba(0,0,0,0.05)" }} />;
}

function LiveThumbnail({ template, scale = 0.25, showBorder = false }: { template: TemplateMeta, scale?: number, showBorder?: boolean }) {
  const isPortrait = template.orientation === "portrait";
  // A4 size in px at 96 DPI
  const pw = isPortrait ? 794 : 1123;
  const ph = isPortrait ? 1123 : 794;

  return (
    <div style={{
      width: pw * scale,
      height: ph * scale,
      background: "white",
      position: "relative",
      boxShadow: showBorder ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
      overflow: "hidden",
      borderRadius: showBorder ? 8 : 0,
      flexShrink: 0
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: pw,
        height: ph,
        position: "absolute",
        top: 0, left: 0,
        pointerEvents: "none"
      }}>
        {template.pages[0]?.elements.map(el => (
           <MiniElement key={el.id} element={el} />
        ))}
      </div>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: "#DCFCE7", color: "#166534", label: "Published" },
  draft:     { bg: "#FEF9C3", color: "#854D0E", label: "Draft" },
  archived:  { bg: "#F1F5F9", color: "#64748B", label: "Archived" },
};
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: s.bg, color: s.color, letterSpacing: 0.3,
    }}>
      {s.label}
    </span>
  );
}

// ── 3-dot action menu ─────────────────────────────────────────────────────────
function ActionMenu({
  template, onView, onEdit, onDuplicate, onDelete, onRestore, onExport, onFav,
}: {
  template: TemplateMeta;
  onView: () => void; onEdit: () => void; onDuplicate: () => void;
  onDelete: () => void; onRestore: () => void; onExport: () => void;
  onFav: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items = template.deletedAt ? [
    { icon: <RotateCcw size={13} />, label: "Restore", action: () => { onRestore(); setOpen(false); } },
    { icon: <Trash2 size={13} />, label: "Delete Permanently", action: () => { onDelete(); setOpen(false); }, danger: true },
  ] : [
    { icon: <Eye size={13} />, label: "Preview", action: () => { onView(); setOpen(false); } },
    !template.isBuiltIn && { icon: <Pencil size={13} />, label: "Edit", action: () => { onEdit(); setOpen(false); } },
    { icon: <Copy size={13} />, label: "Duplicate", action: () => { onDuplicate(); setOpen(false); } },
    { icon: template.favourite ? <HeartOff size={13} /> : <Heart size={13} />, label: template.favourite ? "Unfavourite" : "Favourite", action: () => { onFav(); setOpen(false); } },
    { icon: <Download size={13} />, label: "Export JSON", action: () => { onExport(); setOpen(false); } },
    !template.isBuiltIn && { icon: <Trash2 size={13} />, label: "Delete", action: () => { onDelete(); setOpen(false); }, danger: true },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; action: () => void; danger?: boolean }[];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        style={{
          width: 28, height: 28, borderRadius: 6, border: "none",
          background: open ? "#F1F5F9" : "transparent", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#64748B",
        }}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 1000,
          background: "white", borderRadius: 10, padding: "5px 0",
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)", border: "1px solid #E2E8F0",
          minWidth: 160, animation: "ctx-in 0.12s ease-out",
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "7px 14px",
                fontSize: 12.5, fontWeight: 500,
                color: item.danger ? "#DC2626" : "#1E293B",
                background: "transparent", border: "none", cursor: "pointer",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = item.danger ? "#FEF2F2" : "#F8FAFC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: item.danger ? "#DC2626" : "#64748B" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Full-Screen Preview Modal ──────────────────────────────────────────────────
function TemplatePreviewModal({
  template, onClose, onUse
}: {
  template: TemplateMeta; onClose: () => void; onUse: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);

  const isPortrait = template.orientation === "portrait";
  const pw = isPortrait ? 794 : 1123;
  const ph = isPortrait ? 1123 : 794;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight") setPageIndex(p => Math.min(template.pages.length - 1, p + 1));
    if (e.key === "ArrowLeft") setPageIndex(p => Math.max(0, p - 1));
  }, [onClose, template.pages.length]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentPage = template.pages[pageIndex];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000, background: "rgba(15,23,42,0.9)",
      display: "flex", flexDirection: "column", backdropFilter: "blur(4px)",
      animation: "ctx-in 0.15s ease-out",
    }}>
      {/* Toolbar */}
      <div style={{
        height: 60, background: "rgba(15,23,42,0.95)", borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px"
      }}>
        <div style={{ color: "white", fontSize: 15, fontWeight: 700 }}>
          {template.name} <span style={{ color: "#94A3B8", fontWeight: 400, marginLeft: 8 }}>v{template.version}</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 4 }}>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={{ width: 28, height: 28, background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
            <span style={{ color: "white", fontSize: 12, fontWeight: 600, minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.25))} style={{ width: 28, height: 28, background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>

          <button onClick={onUse} style={{
            padding: "8px 20px", borderRadius: 8, background: "white", color: "#0F172A",
            border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>
            Use Template
          </button>
          
          <button onClick={onClose} style={{ width: 36, height: 36, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", alignItems: "center", padding: 40 }}>
        <div style={{
          width: pw * zoom, height: ph * zoom, background: "white",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)", borderRadius: 8, overflow: "hidden",
          position: "relative", transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
           <div style={{
             transform: `scale(${zoom})`, transformOrigin: "top left",
             width: pw, height: ph, position: "absolute", top: 0, left: 0,
             pointerEvents: "none"
           }}>
             {currentPage?.elements.map(el => (
                <MiniElement key={el.id} element={el} />
             ))}
           </div>
        </div>
      </div>

      {/* Pagination Footer */}
      {template.pages.length > 1 && (
        <div style={{
          height: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
          background: "rgba(15,23,42,0.8)"
        }}>
          <button onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0} style={{ padding: 8, background: "none", border: "none", color: pageIndex === 0 ? "#475569" : "white", cursor: pageIndex === 0 ? "not-allowed" : "pointer" }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>Page {pageIndex + 1} of {template.pages.length}</span>
          <button onClick={() => setPageIndex(p => Math.min(template.pages.length - 1, p + 1))} disabled={pageIndex === template.pages.length - 1} style={{ padding: 8, background: "none", border: "none", color: pageIndex === template.pages.length - 1 ? "#475569" : "white", cursor: pageIndex === template.pages.length - 1 ? "not-allowed" : "pointer" }}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Use Template Modal ────────────────────────────────────────────────────────
function UseTemplateModal({
  template, onClose, onConfirm,
}: {
  template: TemplateMeta; onClose: () => void; onConfirm: (title: string) => void;
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
        animation: "ctx-in 0.15s ease-out",
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
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#1E3A5F"; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
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

// ── Template Card (Grid) ──────────────────────────────────────────────────────
function TemplateCard({
  template, categories, onView, onEdit, onDuplicate, onDelete,
  onRestore, onExport, onFav, onUse,
}: {
  template: TemplateMeta; categories: ReturnType<typeof getCategories>;
  onView: () => void; onEdit: () => void; onDuplicate: () => void;
  onDelete: () => void; onRestore: () => void; onExport: () => void;
  onFav: () => void; onUse: () => void;
}) {
  const cat = categories.find((c) => c.id === template.categoryId);
  const [hovered, setHovered] = useState(false);
  
  // Dynamic scaling so the A4 preview fits inside the 260px height card container
  const isPortrait = template.orientation === "portrait";
  // Portrait: H = 1123. Target ~ 210px -> Scale = 0.19
  // Landscape: W = 1123. Target ~ 240px -> Scale = 0.21
  const previewScale = isPortrait ? 0.19 : 0.21; 

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white", borderRadius: 16,
        border: `1px solid ${hovered ? "#CBD5E1" : "#E2E8F0"}`,
        boxShadow: hovered ? "0 12px 32px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden", cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hovered ? "translateY(-4px)" : "none",
        display: "flex", flexDirection: "column",
        height: 400, // Fixed height for consistent grids
        position: "relative"
      }}
    >
      {/* Thumbnail Area (approx 65% height) */}
      <div
        onClick={onView}
        style={{
          background: template.deletedAt ? "#F1F5F9" : "linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)",
          height: 260,
          display: "flex", justifyContent: "center", alignItems: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{
          transition: "transform 0.3s ease",
          transform: hovered ? "scale(1.05)" : "scale(1)"
        }}>
          <LiveThumbnail template={template} scale={previewScale} showBorder={true} />
        </div>

        {/* Hover overlay with Quick Actions */}
        {hovered && !template.deletedAt && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(15,23,42,0.6)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 10, animation: "ctx-in 0.15s ease-out",
          }}>
            <button onClick={(e) => { e.stopPropagation(); onUse(); }} style={{
              padding: "10px 24px", borderRadius: 30, background: "white", color: "#0F172A",
              border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}>
              Use Template
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); onView(); }} style={{
                padding: "8px 16px", borderRadius: 30, background: "rgba(255,255,255,0.2)", color: "white",
                border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(4px)"
              }}>
                Preview
              </button>
              {!template.isBuiltIn && (
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} style={{
                  padding: "8px 16px", borderRadius: 30, background: "rgba(255,255,255,0.2)", color: "white",
                  border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(4px)"
                }}>
                  Edit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Favourite star */}
        <button
          onClick={(e) => { e.stopPropagation(); onFav(); }}
          style={{
            position: "absolute", top: 12, left: 12,
            background: "white", border: "none", cursor: "pointer",
            color: template.favourite ? "#F59E0B" : "#94A3B8",
            padding: 6, borderRadius: "50%",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          title="Toggle favourite"
        >
          <Star size={14} fill={template.favourite ? "#F59E0B" : "none"} />
        </button>

        {/* Built-in badge */}
        {template.isBuiltIn && (
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
            background: "rgba(30,58,95,0.9)", color: "white",
            padding: "4px 8px", borderRadius: 6, backdropFilter: "blur(4px)"
          }}>
            BUILT-IN
          </div>
        )}

        {/* Action menu */}
        <div style={{ position: "absolute", top: 12, right: 12 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ background: "white", borderRadius: "50%", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <ActionMenu
              template={template}
              onView={onView} onEdit={onEdit} onDuplicate={onDuplicate}
              onDelete={onDelete} onRestore={onRestore} onExport={onExport} onFav={onFav}
            />
          </div>
        </div>
      </div>

      {/* Info Area (approx 35% height) */}
      <div
        onClick={onView}
        style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", gap: 6, background: "white" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: "#0F172A",
            lineHeight: 1.3, flex: 1,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>
            {template.name}
          </div>
          <StatusBadge status={template.status} />
        </div>

        <div style={{
          fontSize: 12, color: "#64748B", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
          overflow: "hidden", minHeight: 16
        }}>
          {template.description || "No description provided"}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto", flexWrap: "wrap" }}>
          {cat && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: "#F1F5F9", color: "#334155", letterSpacing: 0.2,
            }}>
              {cat.name}
            </span>
          )}
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
            background: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0",
          }}>
            {template.pageSize} · {template.orientation === "portrait" ? "Port" : "Land"}
          </span>
          <span style={{ fontSize: 10.5, color: "#94A3B8", marginLeft: "auto", fontWeight: 600 }}>
            v{template.version}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Template Row (List view) ──────────────────────────────────────────────────
function TemplateRow({
  template, categories, onView, onEdit, onDuplicate, onDelete,
  onRestore, onExport, onFav, onUse,
}: Parameters<typeof TemplateCard>[0]) {
  const cat = categories.find((c) => c.id === template.categoryId);
  return (
    <tr
      style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFC"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LiveThumbnail template={template} scale={0.08} showBorder={true} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{template.name}</div>
            {template.description && (
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, maxWidth: 300 }}
                className="line-clamp-1"
              >{template.description}</div>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#475569" }}>
        {cat?.name ?? template.categoryId}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#475569", textTransform: "capitalize" }}>
        {template.orientation}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#475569" }}>
        {template.pages.length}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#475569" }}>
        {template.createdBy}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#475569" }}>
        {new Date(template.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <StatusBadge status={template.status} />
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={onUse}
            style={{
              padding: "4px 12px", borderRadius: 6, border: "none",
              background: "#1E3A5F", color: "white",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            Use
          </button>
          <button onClick={onFav} style={{ border: "none", background: "none", cursor: "pointer", color: template.favourite ? "#F59E0B" : "#CBD5E1" }}>
            <Star size={14} fill={template.favourite ? "#F59E0B" : "none"} />
          </button>
          <ActionMenu
            template={template}
            onView={onView} onEdit={onEdit} onDuplicate={onDuplicate}
            onDelete={onDelete} onRestore={onRestore} onExport={onExport} onFav={onFav}
          />
        </div>
      </td>
    </tr>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: "white", borderRadius: 14, border: "1.5px solid #E8EDF3",
      overflow: "hidden", animation: "pulse 1.5s ease-in-out infinite",
    }}>
      <div style={{ height: 260, background: "#F1F5F9" }} />
      <div style={{ padding: "16px" }}>
        {[70, 100, 80].map((w, i) => (
          <div key={i} style={{
            height: i === 0 ? 14 : 10, background: "#F1F5F9",
            borderRadius: 4, marginBottom: 8, width: `${w}%`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "success" ? "#0F2336" : "#DC2626",
      color: "white", padding: "12px 20px", borderRadius: 10,
      fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)", animation: "ftbar-in 0.2s ease-out",
    }}>
      {type === "success" ? <Check size={15} /> : <X size={15} />}
      {message}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PER_PAGE = 12;

type SortKey = "newest" | "oldest" | "updated" | "alpha" | "usage";

export default function TemplatesPage() {
  const router     = useRouter();
  const { user }   = useAuth();
  const categories = getCategories();

  const [templates,    setTemplates]    = useState<TemplateMeta[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("grid");
  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("all");
  const [orientFilter, setOrientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [favFilter,    setFavFilter]    = useState(false);
  const [trashMode,    setTrashMode]    = useState(false);
  const [sort,         setSort]         = useState<SortKey>("newest");
  const [page,         setPage]         = useState(1);
  const [toast,        setToast]        = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const [useModal,     setUseModal]     = useState<TemplateMeta | null>(null);
  const [previewModal, setPreviewModal] = useState<TemplateMeta | null>(null);

  const importRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setTemplates(getTemplates(true));
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Filter & Sort ─────────────────────────────────────────────────────────
  const filtered = templates
    .filter((t) => trashMode ? !!t.deletedAt : !t.deletedAt)
    .filter((t) => catFilter    === "all" || t.categoryId  === catFilter)
    .filter((t) => orientFilter === "all" || t.orientation === orientFilter)
    .filter((t) => statusFilter === "all" || t.status      === statusFilter)
    .filter((t) => !favFilter   || t.favourite)
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q)
        || t.description.toLowerCase().includes(q)
        || categories.find((c) => c.id === t.categoryId)?.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === "newest")  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "oldest")  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "updated") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === "alpha")   return a.name.localeCompare(b.name);
      if (sort === "usage")   return (b.usageCount || 0) - (a.usageCount || 0);
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, catFilter, orientFilter, statusFilter, favFilter, sort, trashMode]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleView = (t: TemplateMeta) => setPreviewModal(t);

  const handleEdit = (t: TemplateMeta) => {
    if (t.isBuiltIn) { showToast("Built-in templates are read-only. Duplicate first.", "error"); return; }
    router.push(`/documents/builder/template-${t.id}?templateMode=true`);
  };

  const handleDuplicate = (t: TemplateMeta) => {
    const copy = duplicateTemplate(t.id);
    if (copy) { load(); showToast(`"${copy.name}" created`); }
  };

  const handleDelete = (t: TemplateMeta) => {
    if (t.deletedAt) { hardDeleteTemplate(t.id); showToast("Permanently deleted"); }
    else             { deleteTemplate(t.id);     showToast(`"${t.name}" moved to trash`); }
    load();
  };

  const handleRestore = (t: TemplateMeta) => {
    restoreTemplate(t.id);
    load();
    showToast(`"${t.name}" restored`);
  };

  const handleFav = (t: TemplateMeta) => {
    toggleFavourite(t.id);
    load();
  };

  const handleExport = (t: TemplateMeta) => {
    const json = exportTemplate(t.id);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${t.name.replace(/[^a-z0-9]/gi, "_")}.template.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Template exported");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const json   = evt.target?.result as string;
      const result = importTemplate(json, user?.name || "Admin");
      if (result) { load(); showToast(`"${result.name}" imported`); }
      else        { showToast("Invalid template file", "error"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleUse = (t: TemplateMeta, title: string) => {
    const doc = useTemplate(t, title, user?.name || "Admin");
    router.push(`/documents/builder/${doc.id}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8", fontFamily: "Roboto, sans-serif" }}>
      <style>{`
        @keyframes ftbar-in { from { opacity:0; transform:translateY(6px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
        @keyframes ctx-in   { from { opacity:0; transform:scale(0.95) translateY(-4px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
        input:focus { outline: none; }
        select:focus { outline: none; }
      `}</style>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{
        background: "white", borderBottom: "1px solid #E2E8F0",
        padding: "0 32px",
      }}>
        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 4, letterSpacing: 0.3 }}>
            Dashboard / Documents / Templates
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                Template Library
              </h1>
              <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>
                {filtered.length} template{filtered.length !== 1 ? "s" : ""} · Reusable layouts for all document types
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* Trash toggle */}
              <button
                onClick={() => { setTrashMode((p) => !p); }}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  border: `1.5px solid ${trashMode ? "#DC2626" : "#E2E8F0"}`,
                  background: trashMode ? "#FEF2F2" : "white",
                  color: trashMode ? "#DC2626" : "#64748B", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Trash2 size={14} />
                {trashMode ? "Exit Trash" : "Trash"}
              </button>
              {/* Import */}
              <button
                onClick={() => importRef.current?.click()}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                  border: "1.5px solid #E2E8F0", background: "white", color: "#475569",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <Upload size={14} /> Import
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
              {/* New Template */}
              <button
                onClick={() => router.push("/documents/templates/new")}
                style={{
                  padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 800,
                  background: "linear-gradient(135deg, #1E3A5F, #2563EB)",
                  color: "white", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 4px 14px rgba(30,58,95,0.3)",
                }}
              >
                <Plus size={15} /> New Template
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 10, alignItems: "center", paddingBottom: 16,
          flexWrap: "wrap",
        }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#F8FAFC", border: "1.5px solid #E2E8F0",
            borderRadius: 8, padding: "0 12px", flex: 1, minWidth: 200,
          }}>
            <Search size={14} style={{ color: "#94A3B8", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              style={{
                border: "none", background: "transparent", padding: "8px 0",
                fontSize: 13, flex: 1, color: "#0F172A",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0",
              background: catFilter !== "all" ? "#EFF6FF" : "#F8FAFC",
              fontSize: 12.5, fontWeight: 600, color: catFilter !== "all" ? "#1D4ED8" : "#475569",
              cursor: "pointer",
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Orientation */}
          <select
            value={orientFilter}
            onChange={(e) => setOrientFilter(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0",
              background: orientFilter !== "all" ? "#EFF6FF" : "#F8FAFC",
              fontSize: 12.5, fontWeight: 600, color: orientFilter !== "all" ? "#1D4ED8" : "#475569",
              cursor: "pointer",
            }}
          >
            <option value="all">All Orientations</option>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0",
              background: statusFilter !== "all" ? "#EFF6FF" : "#F8FAFC",
              fontSize: 12.5, fontWeight: 600, color: statusFilter !== "all" ? "#1D4ED8" : "#475569",
              cursor: "pointer",
            }}
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0",
              background: "#F8FAFC", fontSize: 12.5, fontWeight: 600, color: "#475569", cursor: "pointer",
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="updated">Recently Updated</option>
            <option value="alpha">A → Z</option>
            <option value="usage">Most Used</option>
          </select>

          {/* Favourite toggle */}
          <button
            onClick={() => setFavFilter((p) => !p)}
            style={{
              padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
              border: `1.5px solid ${favFilter ? "#F59E0B" : "#E2E8F0"}`,
              background: favFilter ? "#FFFBEB" : "#F8FAFC",
              color: favFilter ? "#D97706" : "#475569", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <Star size={13} fill={favFilter ? "#D97706" : "none"} />
            Favourites
          </button>

          {/* View mode */}
          <div style={{
            display: "flex", border: "1.5px solid #E2E8F0",
            borderRadius: 8, overflow: "hidden", flexShrink: 0,
          }}>
            {[
              { mode: "grid" as const, icon: <Grid3X3 size={15} /> },
              { mode: "list" as const, icon: <List size={15} />   },
            ].map(({ mode, icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  width: 36, height: 36, border: "none",
                  background: viewMode === mode ? "#1E3A5F" : "#F8FAFC",
                  color: viewMode === mode ? "white" : "#94A3B8",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{ padding: "28px 32px" }}>
        {trashMode && (
          <div style={{
            background: "#FEF2F2", border: "1.5px solid #FECACA",
            borderRadius: 10, padding: "10px 16px", marginBottom: 20,
            fontSize: 13, color: "#DC2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
          }}>
            <Trash2 size={15} /> Showing deleted templates — restore or permanently delete them here.
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && paginated.length === 0 && (
          <div style={{
            textAlign: "center", padding: "80px 32px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LayoutTemplate size={36} style={{ color: "#3B82F6" }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }}>
              {trashMode ? "Trash is empty" : search || catFilter !== "all" ? "No templates match your filters" : "No templates yet"}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", maxWidth: 340 }}>
              {trashMode
                ? "All deleted templates appear here. Nothing to restore."
                : search || catFilter !== "all"
                ? "Try a different search or clear the filters."
                : "Create your first template and start building beautiful documents."}
            </div>
            {!trashMode && (
              <button
                onClick={() => router.push("/documents/templates/new")}
                style={{
                  padding: "10px 24px", borderRadius: 10,
                  background: "linear-gradient(135deg, #1E3A5F, #2563EB)",
                  color: "white", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 800,
                  display: "flex", alignItems: "center", gap: 7,
                  boxShadow: "0 4px 14px rgba(30,58,95,0.3)",
                }}
              >
                <Plus size={15} /> Create Template
              </button>
            )}
          </div>
        )}

        {/* Grid view */}
        {!isLoading && paginated.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginated.map((t) => (
              <TemplateCard
                key={t.id} template={t} categories={categories}
                onView={() => handleView(t)}
                onEdit={() => handleEdit(t)}
                onDuplicate={() => handleDuplicate(t)}
                onDelete={() => handleDelete(t)}
                onRestore={() => handleRestore(t)}
                onExport={() => handleExport(t)}
                onFav={() => handleFav(t)}
                onUse={() => setUseModal(t)}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {!isLoading && paginated.length > 0 && viewMode === "list" && (
          <div style={{ background: "white", borderRadius: 14, border: "1.5px solid #E8EDF3", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                  {["Template", "Category", "Orientation", "Pages", "Created By", "Updated", "Status", "Actions"].map((col) => (
                    <th key={col} style={{
                      padding: "11px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 800, color: "#64748B",
                      letterSpacing: 0.5, textTransform: "uppercase",
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((t) => (
                  <TemplateRow
                    key={t.id} template={t} categories={categories}
                    onView={() => handleView(t)}
                    onEdit={() => handleEdit(t)}
                    onDuplicate={() => handleDuplicate(t)}
                    onDelete={() => handleDelete(t)}
                    onRestore={() => handleRestore(t)}
                    onExport={() => handleExport(t)}
                    onFav={() => handleFav(t)}
                    onUse={() => setUseModal(t)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 28, flexWrap: "wrap", gap: 12,
          }}>
            <div style={{ fontSize: 12.5, color: "#64748B", fontWeight: 600 }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} templates
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: "1.5px solid #E2E8F0",
                  background: "white", cursor: page === 1 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: page === 1 ? "#CBD5E1" : "#475569",
                }}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && arr[i - 1] !== p - 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={i} style={{ color: "#94A3B8", fontSize: 13, padding: "0 4px" }}>…</span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setPage(p)}
                      style={{
                        width: 34, height: 34, borderRadius: 8,
                        border: `1.5px solid ${page === p ? "#1E3A5F" : "#E2E8F0"}`,
                        background: page === p ? "#1E3A5F" : "white",
                        color: page === p ? "white" : "#475569",
                        fontSize: 13, fontWeight: page === p ? 800 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  width: 34, height: 34, borderRadius: 8, border: "1.5px solid #E2E8F0",
                  background: "white", cursor: page === totalPages ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: page === totalPages ? "#CBD5E1" : "#475569",
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Use Template modal */}
      {useModal && (
        <UseTemplateModal
          template={useModal}
          onClose={() => setUseModal(null)}
          onConfirm={(title) => { handleUse(useModal, title); setUseModal(null); }}
        />
      )}

      {/* Full-screen Preview modal */}
      {previewModal && (
        <TemplatePreviewModal
          template={previewModal}
          onClose={() => setPreviewModal(null)}
          onUse={() => { setUseModal(previewModal); setPreviewModal(null); }}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}
