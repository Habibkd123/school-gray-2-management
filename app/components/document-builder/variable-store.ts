// ─── Variable Store — localStorage persistence for Phase-4 ───────────────────
// Manages custom variables, favourites, and recent variable history.

import type { VariableDefinition } from "./variable-definitions";

const CUSTOM_VARS_KEY  = "erp_custom_variables";
const FAVOURITES_KEY   = "erp_variable_favourites";
const RECENTS_KEY      = "erp_variable_recents";

const MAX_RECENTS = 12;

// ─── Custom Variables ─────────────────────────────────────────────────────────

export interface CustomVariable {
  key: string;         // e.g. "custom.school_motto"
  label: string;       // e.g. "School Motto"
  description: string;
  previewValue: string;
  createdAt: string;
  updatedAt: string;
}

function readCustomVars(): CustomVariable[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_VARS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeCustomVars(vars: CustomVariable[]): void {
  localStorage.setItem(CUSTOM_VARS_KEY, JSON.stringify(vars));
}

export function getCustomVariables(): CustomVariable[] {
  return readCustomVars();
}

export function saveCustomVariable(v: Omit<CustomVariable, "key" | "createdAt" | "updatedAt">): CustomVariable {
  const all  = readCustomVars();
  const now  = new Date().toISOString();
  // Derive a safe key from the label
  const slug = v.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const key  = `custom.${slug}`;
  const existing = all.findIndex((x) => x.key === key);
  const entry: CustomVariable = { key, ...v, createdAt: existing >= 0 ? all[existing].createdAt : now, updatedAt: now };
  if (existing >= 0) all[existing] = entry;
  else all.unshift(entry);
  writeCustomVars(all);
  return entry;
}

export function deleteCustomVariable(key: string): void {
  writeCustomVars(readCustomVars().filter((v) => v.key !== key));
}

/** Convert CustomVariable to VariableDefinition shape for unified rendering */
export function customToDefinition(cv: CustomVariable): VariableDefinition {
  return {
    key:          cv.key,
    label:        cv.label,
    category:     "Custom",
    categoryId:   "custom",
    description:  cv.description,
    previewValue: cv.previewValue,
    dataType:     "text",
  };
}

// ─── Favourites ───────────────────────────────────────────────────────────────

export function getFavourites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function toggleVariableFavourite(key: string): string[] {
  const favs = getFavourites();
  const idx  = favs.indexOf(key);
  if (idx >= 0) favs.splice(idx, 1);
  else          favs.unshift(key);
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favs));
  return favs;
}

// ─── Recents ──────────────────────────────────────────────────────────────────

export function getRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function recordRecentVariable(key: string): void {
  const recents = getRecents().filter((k) => k !== key);
  recents.unshift(key);
  if (recents.length > MAX_RECENTS) recents.length = MAX_RECENTS;
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}
