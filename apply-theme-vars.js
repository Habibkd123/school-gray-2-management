/**
 * apply-theme-vars.js
 * Replaces hardcoded navy/saffron hex colors with CSS variable-based Tailwind classes.
 * Run: node apply-theme-vars.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "app");

const REPLACEMENTS = [
  // Longer / compound patterns first
  ["hover:bg-[#162C47]", "hover:bg-[var(--primary-hover)]"],
  ["hover:bg-[#D97706]", "hover:bg-[var(--primary-hover)]"],
  ["group-hover:bg-[#1E3A5F]", "group-hover:bg-primary"],
  ["group-hover:bg-[#F59E0B]", "group-hover:bg-primary"],
  ["group-hover:text-[#1E3A5F]", "group-hover:text-primary"],
  ["focus:border-[#1E3A5F]/50", "focus:border-primary/50"],
  ["focus:border-[#F59E0B]", "focus:border-primary"],
  ["focus:border-[#1E3A5F]", "focus:border-primary"],
  ["focus:ring-[#F59E0B]", "focus:ring-primary"],
  ["shadow-[#1E3A5F]/30", "shadow-primary/30"],
  ["shadow-[#1E3A5F]/20", "shadow-primary/20"],
  ["shadow-[#F59E0B]/20", "shadow-primary/20"],
  ["bg-[#1E3A5F]/10", "bg-primary/10"],
  ["bg-[#F59E0B]/10", "bg-primary/10"],
  ["bg-[#1E3A5F]/5", "bg-primary/5"],
  ["text-[#1E3A5F]/30", "text-primary/30"],
  ["border-l-[#1E3A5F]", "border-l-primary"],
  ["border-b-4 border-[#1E3A5F]", "border-b-4 border-primary"],
  ["border-b-4 border-[#F59E0B]", "border-b-4 border-primary"],
  ["border-2 border-[#1E3A5F]", "border-2 border-primary"],
  ["border-4 border-[#1E3A5F]", "border-4 border-primary"],
  ["hover:border-[#1E3A5F]", "hover:border-primary"],
  ["hover:border-[#F59E0B]", "hover:border-primary"],
  ["hover:text-[#1E3A5F]", "hover:text-primary"],
  ["hover:text-[#D97706]", "hover:text-[var(--primary-hover)]"],
  ["hover:bg-[#F59E0B]", "hover:bg-primary"],
  ["from-[#1E3A5F]", "from-primary"],
  ["to-[#162C47]", "to-[var(--primary-hover)]"],
  ["stroke-[#1E3A5F]", "stroke-primary"],
  ["stroke-[#F59E0B]", "stroke-primary"],
  ["fill-[#1E3A5F]", "fill-primary"],
  ["ring-[#F59E0B]", "ring-primary"],
  ["text-[#1E3A5F]", "text-primary"],
  ["text-[#F59E0B]", "text-primary"],
  ["bg-[#1E3A5F]", "bg-primary"],
  ["bg-[#F59E0B]", "bg-primary"],
  ["bg-[#162C47]", "bg-[var(--primary-hover)]"],
  ["bg-[#D97706]", "bg-[var(--primary-hover)]"],
  ["border-[#1E3A5F]", "border-primary"],
  ["border-[#F59E0B]", "border-primary"],
  ["bg-[#F0F4F9]", "bg-[var(--section-alt)]"],
  ["bg-[#FFF7E6]", "bg-[var(--section-alt)]"],
  // Inline style / JS string literals (charts, modals)
  ['color: "#1E3A5F"', 'color: "var(--primary)"'],
  ['color: "#F59E0B"', 'color: "var(--primary)"'],
  ['color: "#162C47"', 'color: "var(--primary-hover)"'],
  ['background-color:#F59E0B', 'background-color:var(--primary)'],
  ['background-color:#1E3A5F', 'background-color:var(--primary)'],
  ['linear-gradient(135deg, #1E3A5F 0%, #162C47 100%)', 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)'],
  ["hover:text-[#162C47]", "hover:text-[var(--primary-hover)]"],
  ["hover:text-[#D97706]", "hover:text-[var(--primary-hover)]"],
  ["focus:ring-[#1E3A5F]", "focus:ring-primary"],
  ["ring-[#1E3A5F]", "ring-primary"],
  ["divide-[#1E3A5F]", "divide-primary"],
  ["from-[#F59E0B]", "from-primary"],
  ["to-[#D97706]", "to-[var(--primary-hover)]"],
  ["bg-[#EAEFFF]", "bg-primary/10"],
  ["dark:bg-[#FFB800]/20", "dark:bg-warning/20"],
  ["bg-[#FFB800]", "bg-warning"],
  ["text-[#FFB800]", "text-warning"],
  ["accent-[#1E3A5F]", "accent-primary"],
  ["accent-[#F59E0B]", "accent-primary"],
  ["border-t-[#1E3A5F]", "border-t-primary"],
  ["border-t-[#F59E0B]", "border-t-primary"],
  ["bg-[#FFF9E6]", "bg-primary/10"],
  ["text-[#162C47]", "text-[var(--primary-hover)]"],
  ["hover:bg-indigo-50", "hover:bg-primary/10"],
  ["bg-[#FFF3CD] dark:bg-amber-900/20 text-[#92400E] dark:text-amber-500", "bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)] dark:text-primary"],
  ["bg-[#FFF3CD] hover:bg-primary text-[#92400E]", "bg-primary/10 hover:bg-primary text-[var(--primary-hover)]"],
  ["bg-[#FFF3CD] text-[#92400E]", "bg-primary/10 text-[var(--primary-hover)]"],
  ["dark:bg-amber-900/20 text-[var(--primary-hover)] dark:text-amber-500", "dark:bg-primary/20 text-[var(--primary-hover)] dark:text-primary"],
  ["text-[#00B5FF]", "text-info"],
  ["bg-[#E6F8FF]", "bg-info/10"],
  ["hover:text-[#0091cc]", "hover:text-info"],
  ["bg-[#00B5FF]", "bg-info"],
  ["'bg-emerald-500' : 'bg-amber-500'", "'bg-success' : 'bg-primary'"],
  ["bg-[#E8F8E8] text-[#1D7F2C]", "bg-success/10 text-success"],
  ["bg-[#FFEBF0] text-[#FF4A6B]", "bg-danger/10 text-danger"],
  ["bg-[#FFF0F2] text-[#FF4A6B]", "bg-danger/10 text-danger"],
  ["bg-[#1DD04A]", "bg-success"],
  ["bg-[#FF4A6B]", "bg-danger"],
  ["text-[#1DD04A]", "text-success"],
  ["text-[#FF4A6B]", "text-danger"],
  ["text-[#1D7F2C]", "text-success"],
  ["stroke=\"#1DD04A\"", "stroke=\"var(--success)\""],
  ["stroke=\"#FF4A6B\"", "stroke=\"var(--danger)\""],
  ["stopColor=\"#00B5FF\"", "stopColor=\"var(--info)\""],
  ["stroke=\"#00B5FF\"", "stroke=\"var(--info)\""],
  ["fill=\"#00B5FF\"", "fill=\"var(--info)\""],
  ["text-[#3B66FF]", "text-info"],
  ["bg-amber-50 dark:bg-amber-900/20 text-[#92400E]", "bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)]"],
  ["text-[#0F172A]", "text-foreground"],
  ["bg-[#0F172A]", "bg-[var(--sidebar-bg)]"],
  ["from-[#0F172A]/90", "from-[var(--sidebar-bg)]/90"],
  ["via-[#0F172A]/20", "via-[var(--sidebar-bg)]/20"],
  ["bg-[#0F172A]/5", "bg-[var(--sidebar-bg)]/5"],
  ["border-[#0F172A]/10", "border-[var(--sidebar-bg)]/10"],
  ["border-l-4 border-[#0F172A]", "border-l-4 border-primary"],
];

const SKIP_DIRS = new Set(["node_modules", ".next"]);
const SKIP_FILES = new Set([
  "SchoolThemeProvider.tsx",
]);

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, callback);
    else if (/\.(tsx|ts|css|jsx|js)$/.test(entry.name)) callback(full);
  }
}

let changedFiles = 0;

walk(ROOT, (filePath) => {
  // Skip email HTML in API routes — emails can't use CSS vars reliably
  if (filePath.includes(path.join("api", "auth"))) return;
  if (SKIP_FILES.has(path.basename(filePath))) return;

  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    changedFiles++;
    console.log("Updated:", path.relative(__dirname, filePath));
  }
});

console.log(`\nDone. ${changedFiles} file(s) updated.`);
