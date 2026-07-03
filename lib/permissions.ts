// ─── Roles & Permissions — Static Permission Map ──────────────────────────
// Har role ke liye permissions yahan define hain.
// Action types: "view" | "create" | "edit" | "delete" | "approve"

export const HIDE_FEES_FEATURE = false;

export type PermissionAction = "view" | "create" | "edit" | "delete" | "approve";

export type PermissionModule =
  | "dashboard"
  | "students"
  | "teachers"
  | "parents"
  | "classes"
  | "academic"
  | "examination"
  | "attendance"
  | "fees"
  | "transport"
  | "reports"
  | "notices"
  | "settings"
  | "leaves"
  | "homework"
  | "results"
  | "salary"
  | "assessments";

export type AppRole =
  // | "super_admin"
  | "school_admin"
  | "accountant"
  | "teacher"
  | "parent"
  | "student";

// Permission entry: module → set of allowed actions
export type RolePermissions = Partial<Record<PermissionModule, PermissionAction[]>>;

// ─── Master Permission Map ────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  // ── Super Admin: everything ──────────────────────────────────────────────
  // super_admin: {
  //   dashboard:   ["view"],
  //   students:    ["view", "create", "edit", "delete"],
  //   teachers:    ["view", "create", "edit", "delete"],
  //   parents:     ["view", "create", "edit", "delete"],
  //   classes:     ["view", "create", "edit", "delete"],
  //   academic:    ["view", "create", "edit", "delete"],
  //   examination: ["view", "create", "edit", "delete"],
  //   attendance:  ["view", "create", "edit", "delete"],
  //   fees:        ["view", "create", "edit", "delete"],
  //   transport:   ["view", "create", "edit", "delete"],
  //   reports:     ["view"],
  //   notices:     ["view", "create", "edit", "delete"],
  //   settings:    ["view", "edit"],
  //   leaves:      ["view", "create", "approve", "delete"],
  //   homework:    ["view", "create", "edit", "delete"],
  //   results:     ["view", "create", "edit", "delete"],
  // },

  // ── Principal / Admin (school_admin): full school access ─────────────────
  school_admin: {
    dashboard: ["view"],
    students: ["view", "create", "edit", "delete"],
    teachers: ["view", "create", "edit", "delete"],
    parents: ["view", "create", "edit", "delete"],
    classes: ["view", "create", "edit", "delete"],
    academic: ["view", "create", "edit", "delete"],
    examination: ["view", "create", "edit", "delete"],
    attendance: ["view", "create", "edit", "delete"],
    fees: ["view", "create", "edit", "delete"],
    transport: ["view", "create", "edit", "delete"],
    reports: ["view"],
    notices: ["view", "create", "edit", "delete"],
    settings: ["view", "edit"],
    leaves: ["view", "create", "approve", "delete"],
    homework: ["view", "create", "edit", "delete"],
    results: ["view", "create", "edit", "delete"],
    assessments: ["view", "create", "edit", "delete"],
    salary: ["view", "create", "edit", "delete"],
  },

  // ── Accountant: only fees & finance related ──────────────────────────────
  accountant: {
    dashboard: ["view"],
    fees: ["view", "create", "edit", "delete"],
    salary: ["view", "create", "edit", "delete"],
    students: ["view"],                // read-only for reference
    reports: ["view"],
    notices: ["view"],
    settings: ["view"],
  },

  // ── Teacher: classes, academic, attendance, marks ────────────────────────
  teacher: {
    dashboard: ["view"],
    students: ["view"],
    classes: ["view"],
    academic: ["view", "create", "edit"],
    examination: ["view", "create", "edit"],
    attendance: ["view", "create", "edit"],
    notices: ["view"],
    leaves: ["view", "create"],
    homework: ["view", "create", "edit", "delete"],
    results: ["view", "create", "edit"],
    reports: ["view"],
    assessments: ["view", "create", "edit"],
    salary: ["view"],
  },

  // ── Parent: read-only for their child ────────────────────────────────────
  parent: {
    dashboard: ["view"],
    attendance: ["view"],
    fees: ["view"],
    results: ["view"],
    homework: ["view"],
    notices: ["view"],
  },

  // ── Student: read-only own data ──────────────────────────────────────────
  student: {
    dashboard: ["view"],
    academic: ["view"],
    attendance: ["view"],
    examination: ["view"],
    fees: ["view"],
    notices: ["view"],
    leaves: ["view", "create"],
    homework: ["view"],
    results: ["view"],
    assessments: ["view"],
  },
};

// ─── Helper: Check single permission ─────────────────────────────────────
export function hasPermission(
  role: string,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (HIDE_FEES_FEATURE && module === "fees") return false;
  const roleKey = role as AppRole;
  const rolePerms = ROLE_PERMISSIONS[roleKey];
  if (!rolePerms) return false;
  const modulePerms = rolePerms[module];
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}

// ─── Helper: Get all permissions for a role ───────────────────────────────
export function getPermissions(role: string): RolePermissions {
  return ROLE_PERMISSIONS[role as AppRole] ?? {};
}

// ─── Helper: Get all allowed modules for a role ───────────────────────────
export function getAllowedModules(role: string): PermissionModule[] {
  const perms = getPermissions(role);
  const modules = Object.keys(perms) as PermissionModule[];
  if (HIDE_FEES_FEATURE) {
    return modules.filter((m) => m !== "fees");
  }
  return modules;
}

// ─── UI Role Labels & Metadata ────────────────────────────────────────────
export interface RoleMeta {
  label: string;
  description: string;
  color: string;        // Tailwind badge color classes
  badgeBg: string;
  badgeText: string;
}

export const ROLE_META: Record<AppRole, RoleMeta> = {
  // super_admin: {
  //   label: "Super Admin",
  //   description: "Manages multiple schools. Has unrestricted access to everything.",
  //   color: "red",
  //   badgeBg: "bg-red-500/20",
  //   badgeText: "text-red-400",
  // },
  school_admin: {
    label: "Principal / Admin",
    description: "Full access to all school modules — students, staff, fees, reports.",
    color: "blue",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-400",
  },
  accountant: {
    label: "Accountant",
    description: "Manages fees collection, financial records and payment reports.",
    color: "yellow",
    badgeBg: "bg-yellow-500/20",
    badgeText: "text-yellow-400",
  },
  teacher: {
    label: "Teacher",
    description: "Manages classes, attendance, homework, marks and exam results.",
    color: "emerald",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-400",
  },
  parent: {
    label: "Parent",
    description: "Read-only access to child's attendance, fees, results and homework.",
    color: "purple",
    badgeBg: "bg-purple-500/20",
    badgeText: "text-purple-400",
  },
  student: {
    label: "Student",
    description: "Read-only access to own academic data, attendance, results and fees.",
    color: "amber",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-400",
  },
};

// ─── All modules with labels (for the permissions table UI) ───────────────
export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  students: "Students",
  teachers: "Teachers",
  parents: "Parents / Guardians",
  classes: "Classes & Schedule",
  academic: "Academic",
  examination: "Examination",
  attendance: "Attendance",
  fees: "Fees Collection",
  transport: "Transport",
  reports: "Reports",
  notices: "Notice Board",
  settings: "Settings",
  leaves: "Leave Management",
  homework: "Homework",
  results: "Exam Results",
  salary: "Salary & Payroll",
  assessments: "Assessments / Tests",
};

export const ALL_MODULES: PermissionModule[] = Object.keys(MODULE_LABELS) as PermissionModule[];
export const ALL_ROLES: AppRole[] = Object.keys(ROLE_PERMISSIONS) as AppRole[];
export const ALL_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete", "approve"];
