// ─── Document Builder — localStorage Store ────────────────────────────────────

import type { DocumentMeta, DocumentCategory, TemplateMeta, CanvasPage } from "./types";
import { TEMPLATE_DEFINITIONS } from "./templates-data";

const DOCS_KEY      = "erp_documents";
const CATS_KEY      = "erp_doc_categories";
const TMPLS_KEY     = "erp_templates";


// ─── Documents ───────────────────────────────────────────────────────────────

export function getDocuments(): DocumentMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getDocument(id: string): DocumentMeta | null {
  return getDocuments().find((d) => d.id === id) ?? null;
}

export function saveDocument(doc: DocumentMeta): DocumentMeta {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  const updated = { ...doc, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    docs[idx] = updated;
  } else {
    docs.unshift(updated);
  }
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  return updated;
}

export function deleteDocument(id: string): void {
  const docs = getDocuments().filter((d) => d.id !== id);
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function duplicateDocument(id: string): DocumentMeta | null {
  const doc = getDocument(id);
  if (!doc) return null;
  const copy: DocumentMeta = {
    ...doc,
    id: crypto.randomUUID(),
    title: `${doc.title} (Copy)`,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // deep-clone pages
    pages: JSON.parse(JSON.stringify(doc.pages)),
  };
  saveDocument(copy);
  return copy;
}

export function createDocument(
  title: string,
  categoryId: string,
  templateId: string,
  createdBy: string,
  pages: DocumentMeta["pages"],
  pageSize: DocumentMeta["pageSize"] = "A4",
  orientation: DocumentMeta["orientation"] = "portrait",
  recordId?: string,
  recordType?: string,
  recordName?: string,
  resolvedVariables?: Record<string, string>
): DocumentMeta {
  const now = new Date().toISOString();
  const doc: DocumentMeta = {
    id: crypto.randomUUID(),
    title,
    categoryId,
    templateId,
    status: "draft",
    pageSize,
    orientation,
    createdBy,
    createdAt: now,
    updatedAt: now,
    pages,
    recordId,
    recordType,
    recordName,
    resolvedVariables,
  };
  return saveDocument(doc);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const BUILT_IN_CATEGORIES: DocumentCategory[] = [
  { id: "student",      name: "Student",      icon: "GraduationCap", color: "bg-blue-500",    description: "Student-related documents" },
  { id: "teacher",      name: "Teacher",      icon: "Users",         color: "bg-emerald-500", description: "Staff & teacher documents" },
  { id: "certificate",  name: "Certificate",  icon: "Award",         color: "bg-amber-500",   description: "Certificates of all kinds" },
  { id: "fees",         name: "Fees",         icon: "CreditCard",    color: "bg-violet-500",  description: "Fee receipts & invoices" },
  { id: "exam",         name: "Exam",         icon: "ClipboardList", color: "bg-rose-500",    description: "Exam & admit cards" },
  { id: "report_card",  name: "Report Card",  icon: "BookOpen",      color: "bg-indigo-500",  description: "Student report cards" },
  { id: "circular",     name: "Circular",     icon: "Bell",          color: "bg-orange-500",  description: "Official circulars" },
  { id: "notice",       name: "Notice",       icon: "Megaphone",     color: "bg-cyan-500",    description: "Notice board documents" },
  { id: "letter",       name: "Letter",       icon: "FileText",      color: "bg-indigo-500",  description: "Official letters" },
  { id: "blank",        name: "Blank",        icon: "File",          color: "bg-slate-500",   description: "Start from a blank canvas" },
];

export function getCategories(): DocumentCategory[] {
  const builtIn = BUILT_IN_CATEGORIES;
  if (typeof window === "undefined") return builtIn;
  try {
    const raw = localStorage.getItem(CATS_KEY);
    const custom: DocumentCategory[] = raw ? JSON.parse(raw) : [];
    return [...builtIn, ...custom];
  } catch {
    return builtIn;
  }
}

export function saveCategory(cat: DocumentCategory): void {
  if (typeof window === "undefined") return;
  const custom = getCategories().filter((c) => c.isCustom);
  const idx = custom.findIndex((c) => c.id === cat.id);
  if (idx >= 0) custom[idx] = cat;
  else custom.push({ ...cat, isCustom: true });
  localStorage.setItem(CATS_KEY, JSON.stringify(custom));
}

export function deleteCategory(id: string): void {
  if (typeof window === "undefined") return;
  const custom = getCategories()
    .filter((c) => c.isCustom && c.id !== id);
  localStorage.setItem(CATS_KEY, JSON.stringify(custom));
}

// ─── Report Card Batches ──────────────────────────────────────────────────────

const RC_BATCHES_KEY = "erp_report_card_batches";

export interface ReportCardBatch {
  id: string;
  examId: string;
  examName: string;
  classId: string;
  className: string;
  section: string;
  academicYear: string;
  templateId: string;
  templateName: string;
  studentIds: string[];
  documentIds: string[];   // one per student, same order
  status: "draft" | "published";
  createdAt: string;
  publishedAt?: string;
  createdBy: string;
}

export function getReportCardBatches(): ReportCardBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RC_BATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getReportCardBatch(id: string): ReportCardBatch | null {
  return getReportCardBatches().find((b) => b.id === id) ?? null;
}

export function saveReportCardBatch(batch: ReportCardBatch): ReportCardBatch {
  const all = getReportCardBatches();
  const idx = all.findIndex((b) => b.id === batch.id);
  if (idx >= 0) all[idx] = batch;
  else all.unshift(batch);
  localStorage.setItem(RC_BATCHES_KEY, JSON.stringify(all));
  return batch;
}

export function deleteReportCardBatch(id: string): void {
  const all = getReportCardBatches().filter((b) => b.id !== id);
  localStorage.setItem(RC_BATCHES_KEY, JSON.stringify(all));
}

export function publishReportCardBatch(id: string): ReportCardBatch | null {
  const batch = getReportCardBatch(id);
  if (!batch) return null;
  const updated = { ...batch, status: "published" as const, publishedAt: new Date().toISOString() };
  return saveReportCardBatch(updated);
}

// ─── Templates ────────────────────────────────────────────────────────────────

/** Convert the static TemplateDefinition list to TemplateMeta objects (read-only built-ins). */
function builtInTemplates(): TemplateMeta[] {
  return TEMPLATE_DEFINITIONS.map((td) => ({
    id:          td.id,
    name:        td.name,
    description: td.description,
    categoryId:  td.categoryId,
    pageSize:    td.pageSize,
    orientation: td.orientation,
    pages:       td.defaultPages,
    status:      "published" as const,
    favourite:   false,
    thumbnail:   "",            // generated on first view
    version:     "1.0",
    usageCount:  0,
    isBuiltIn:   true,
    createdBy:   "System",
    updatedBy:   "System",
    createdAt:   "2025-01-01T00:00:00Z",
    updatedAt:   "2025-01-01T00:00:00Z",
  }));
}

function getUserTemplates(): TemplateMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TMPLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setUserTemplates(templates: TemplateMeta[]): void {
  localStorage.setItem(TMPLS_KEY, JSON.stringify(templates));
}

/** Returns all templates: built-ins first, then user-created.
 *  Excludes soft-deleted items unless `includeDeleted` is true. */
export function getTemplates(includeDeleted = false): TemplateMeta[] {
  const builtIn    = builtInTemplates();
  const user       = getUserTemplates();

  // Merge: user overrides (e.g. favourite toggle on built-ins) keyed by id
  const overrides  = new Map(user.map((t) => [t.id, t]));

  const merged = builtIn.map((t) => overrides.has(t.id) ? { ...t, ...overrides.get(t.id)! } : t);
  const userOnly = user.filter((t) => !builtIn.some((b) => b.id === t.id));

  return [...merged, ...userOnly].filter((t) => includeDeleted || !t.deletedAt);
}

export function getTemplate(id: string): TemplateMeta | null {
  return getTemplates(true).find((t) => t.id === id) ?? null;
}

export function saveTemplate(template: TemplateMeta): TemplateMeta {
  const user  = getUserTemplates();
  const idx   = user.findIndex((t) => t.id === template.id);
  const now   = new Date().toISOString();
  const saved: TemplateMeta = { ...template, updatedAt: now };
  if (idx >= 0) user[idx] = saved;
  else user.unshift(saved);
  setUserTemplates(user);
  return saved;
}

/** Soft delete — moves to trash */
export function deleteTemplate(id: string): void {
  const tmpl = getTemplate(id);
  if (!tmpl) return;
  saveTemplate({ ...tmpl, deletedAt: new Date().toISOString() });
}

export function restoreTemplate(id: string): void {
  const tmpl = getTemplate(id);
  if (!tmpl) return;
  const { deletedAt: _, ...rest } = tmpl;
  saveTemplate({ ...rest });
}

export function hardDeleteTemplate(id: string): void {
  if (typeof window === "undefined") return;
  const user = getUserTemplates().filter((t) => t.id !== id);
  setUserTemplates(user);
}

export function duplicateTemplate(id: string): TemplateMeta | null {
  const tmpl = getTemplate(id);
  if (!tmpl) return null;
  const now  = new Date().toISOString();
  const copy: TemplateMeta = {
    ...JSON.parse(JSON.stringify(tmpl)),
    id:        crypto.randomUUID(),
    name:      `${tmpl.name} (Copy)`,
    status:    "draft",
    favourite: false,
    isBuiltIn: false,
    usageCount: 0,
    version:   "1.0",
    createdAt: now,
    updatedAt: now,
    deletedAt: undefined,
  };
  return saveTemplate(copy);
}

export function toggleFavourite(id: string): TemplateMeta | null {
  const tmpl = getTemplate(id);
  if (!tmpl) return null;
  return saveTemplate({ ...tmpl, favourite: !tmpl.favourite });
}

/** Bump usage count and create a new document from this template. */
export function useTemplate(
  tmpl: TemplateMeta,
  title: string,
  createdBy: string,
): DocumentMeta {
  // Bump usageCount
  saveTemplate({ ...tmpl, usageCount: (tmpl.usageCount || 0) + 1 });
  // Deep-clone pages so the document is independent
  const pages: CanvasPage[] = JSON.parse(JSON.stringify(tmpl.pages));
  return createDocument(title, tmpl.categoryId, tmpl.id, createdBy, pages, tmpl.pageSize, tmpl.orientation);
}

/** Returns a JSON string ready for download. */
export function exportTemplate(id: string): string | null {
  const tmpl = getTemplate(id);
  if (!tmpl) return null;
  return JSON.stringify(tmpl, null, 2);
}

/** Accepts a raw JSON string, assigns a new id, and saves. */
export function importTemplate(json: string, importedBy: string): TemplateMeta | null {
  try {
    const parsed = JSON.parse(json) as Partial<TemplateMeta>;
    const now    = new Date().toISOString();
    const tmpl: TemplateMeta = {
      id:          crypto.randomUUID(),
      name:        parsed.name || "Imported Template",
      description: parsed.description || "",
      categoryId:  parsed.categoryId  || "blank",
      pageSize:    parsed.pageSize    || "A4",
      orientation: parsed.orientation || "portrait",
      pages:       parsed.pages       || [{ id: crypto.randomUUID(), elements: [] }],
      status:      "draft",
      favourite:   false,
      thumbnail:   "",
      version:     "1.0",
      usageCount:  0,
      isBuiltIn:   false,
      createdBy:   importedBy,
      updatedBy:   importedBy,
      createdAt:   now,
      updatedAt:   now,
    };
    return saveTemplate(tmpl);
  } catch {
    return null;
  }
}

