"use client";

import React, { useState } from "react";
import {
  Shield, Check, Minus, Users, GraduationCap, User,
  BookOpen, DollarSign, ChevronDown, ChevronUp, Info, Loader2
} from "lucide-react";
import {
  ALL_ROLES, ALL_MODULES, ALL_ACTIONS,
  ROLE_PERMISSIONS, ROLE_META, MODULE_LABELS,
  AppRole, PermissionModule, PermissionAction,
} from "@/lib/permissions";
import { useAuth } from "@/app/context/auth";

// ─── Role Icon Map ────────────────────────────────────────────────────────
const roleIcons: Record<AppRole, React.ReactNode> = {
  // super_admin:  <Shield className="w-5 h-5" />,
  school_admin: <Users className="w-5 h-5" />,
  accountant: <DollarSign className="w-5 h-5" />,
  teacher: <BookOpen className="w-5 h-5" />,
  parent: <User className="w-5 h-5" />,
  student: <GraduationCap className="w-5 h-5" />,
};

// ─── Color palette per role ───────────────────────────────────────────────
const roleGradients: Record<AppRole, string> = {
  // super_admin:  "from-red-50 dark:from-red-500/20 to-red-100/50 dark:to-red-600/10 border-red-200 dark:border-red-500/30",
  school_admin: "from-blue-50 dark:from-blue-500/20 to-blue-100/50 dark:to-blue-600/10 border-blue-200 dark:border-blue-500/30",
  accountant: "from-yellow-50 dark:from-yellow-500/20 to-yellow-100/50 dark:to-yellow-600/10 border-yellow-200 dark:border-yellow-500/30",
  teacher: "from-emerald-50 dark:from-emerald-500/20 to-emerald-100/50 dark:to-emerald-600/10 border-emerald-200 dark:border-emerald-500/30",
  parent: "from-purple-50 dark:from-purple-500/20 to-purple-100/50 dark:to-purple-600/10 border-purple-200 dark:border-purple-500/30",
  student: "from-amber-50 dark:from-amber-500/20 to-amber-100/50 dark:to-amber-600/10 border-amber-200 dark:border-amber-500/30",
};

const roleIconBg: Record<AppRole, string> = {
  // super_admin:  "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
  school_admin: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
  accountant: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  teacher: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  parent: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400",
  student: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
};

// Action display config
const actionConfig: Record<PermissionAction, { label: string; color: string; bg: string }> = {
  view: { label: "View", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-500/15" },
  create: { label: "Create", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/15" },
  edit: { label: "Edit", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/15" },
  delete: { label: "Delete", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-500/15" },
  approve: { label: "Approve", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-500/15" },
};

// Count permissions for a role dynamically
function countPermissions(role: AppRole, permissions: Record<string, Record<string, string[]>> | null): number {
  const perms = (permissions && permissions[role]) || ROLE_PERMISSIONS[role] || {};
  return Object.values(perms).reduce((sum, actions) => sum + (actions?.length ?? 0), 0);
}

// ─── Permission Cell ──────────────────────────────────────────────────────
function PermCell({ has }: { has: boolean }) {
  return has ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15">
      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800/60">
      <Minus className="w-3 h-3 text-slate-400 dark:text-slate-600" />
    </span>
  );
}

// ─── Role Card (top summary) ──────────────────────────────────────────────
function RoleCard({
  role,
  isSelected,
  onClick,
  permissions,
}: {
  role: AppRole;
  isSelected: boolean;
  onClick: () => void;
  permissions: Record<string, Record<string, string[]>> | null;
}) {
  const meta = ROLE_META[role];
  const count = countPermissions(role, permissions);

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col gap-3 p-4 rounded-2xl border bg-gradient-to-br bg-white dark:bg-transparent text-left transition-all duration-200 cursor-pointer w-full
        ${roleGradients[role]}
        ${isSelected
          ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0f1117] ring-primary/40 scale-[1.02] shadow-lg"
          : "hover:scale-[1.01] hover:shadow-md"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2.5 rounded-xl ${roleIconBg[role]}`}>
          {roleIcons[role]}
        </div>
        {isSelected && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/10 dark:bg-white/10 text-slate-700 dark:text-white/70 tracking-wider">
            SELECTED
          </span>
        )}
      </div>
      <div>
        <p className="text-[13px] font-bold text-slate-900 dark:text-white">{meta.label}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
          {meta.description}
        </p>
      </div>
      <div className="flex items-center gap-1.5 mt-auto">
        <Shield className="w-3 h-3 text-slate-400 dark:text-slate-500" />
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          <span className="text-slate-900 dark:text-white font-semibold">{count}</span> permissions
        </span>
      </div>
    </button>
  );
}

// ─── Module Row in Permissions Table ─────────────────────────────────────
function ModuleRow({
  module,
  role,
  isExpanded,
  onToggle,
  permissions,
  onPermissionToggle,
  isUpdating,
  canEdit,
}: {
  module: PermissionModule;
  role: AppRole;
  isExpanded: boolean;
  onToggle: () => void;
  permissions: Record<string, Record<string, string[]>> | null;
  onPermissionToggle: (module: PermissionModule, action: PermissionAction) => void;
  isUpdating: boolean;
  canEdit: boolean;
}) {
  const rolePerms = (permissions && permissions[role]) || ROLE_PERMISSIONS[role] || {};
  const modulePerms = rolePerms[module] ?? [];
  const hasAny = modulePerms.length > 0;

  return (
    <>
      <tr
        className={`border-b border-border transition-colors cursor-pointer
          ${hasAny ? "hover:bg-slate-50 dark:hover:bg-slate-800/30" : "opacity-60 hover:bg-slate-50/50 dark:hover:bg-slate-800/10"}`}
        onClick={onToggle}
      >
        <td className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
              {MODULE_LABELS[module]}
            </span>
            {hasAny && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                {modulePerms.length} action{modulePerms.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            {ALL_ACTIONS.map((action) => {
              const allowed = modulePerms.includes(action);
              const cfg = actionConfig[action];
              return allowed ? (
                <span
                  key={action}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                >
                  {cfg.label}
                </span>
              ) : null;
            })}
            {!hasAny && (
              <span className="text-[11px] text-slate-400 dark:text-slate-600 italic">No access</span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-right">
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-auto" />
            : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-auto" />
          }
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50 dark:bg-slate-900/40 animate-in fade-in duration-200">
          <td colSpan={3} className="px-8 py-3 border-b border-border">
            {canEdit ? (
              <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ALL_ACTIONS.map((action) => {
                  const allowed = modulePerms.includes(action);
                  const cfg = actionConfig[action];
                  return (
                    <button
                      key={action}
                      disabled={isUpdating}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPermissionToggle(module, action);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all duration-200 cursor-pointer w-full group
                        ${allowed
                          ? "border-amber-200 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
                          : "border-slate-100 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-900/20 opacity-60 hover:opacity-100"
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
                      ) : (
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-200 shrink-0
                          ${allowed
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          }`}
                        >
                          {allowed && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                        </span>
                      )}
                      <span className={`text-[12px] font-medium transition-colors ${allowed ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"}`}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {ALL_ACTIONS.map((action) => {
                  const allowed = modulePerms.includes(action);
                  const cfg = actionConfig[action];
                  return (
                    <div
                      key={action}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border
                        ${allowed
                          ? "border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40"
                          : "border-slate-100 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-900/20 opacity-60"
                        }`}
                    >
                      <PermCell has={allowed} />
                      <span className={`text-[12px] font-medium ${allowed ? cfg.color : "text-slate-400 dark:text-slate-600"}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────
function ComparisonTable({
  permissions,
}: {
  permissions: Record<string, Record<string, string[]>> | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">
              Module
            </th>
            {ALL_ROLES.map((role) => (
              <th key={role} className="py-3 px-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`p-1.5 rounded-lg ${roleIconBg[role]}`}>
                    {roleIcons[role]}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {ROLE_META[role].label}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_MODULES.map((module, i) => (
            <tr
              key={module}
              className={`border-b border-border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20
                ${i % 2 === 0 ? "bg-transparent" : "bg-slate-50/50 dark:bg-slate-900/20"}`}
            >
              <td className="py-2.5 px-4 text-[12px] font-medium text-slate-800 dark:text-slate-300">
                {MODULE_LABELS[module]}
              </td>
              {ALL_ROLES.map((role) => {
                const rolePerms = (permissions && permissions[role]) || ROLE_PERMISSIONS[role] || {};
                const modulePerms = rolePerms[module] ?? [];
                const hasView = modulePerms.includes("view");
                const hasMore = modulePerms.length > 1;
                return (
                  <td key={role} className="py-2.5 px-3 text-center">
                    {!hasView ? (
                      <Minus className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mx-auto" />
                        {hasMore && (
                          <span className="text-[9px] text-slate-500 font-semibold dark:text-slate-400">
                            +{modulePerms.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function RolesPermissionsPage() {
  const { user, permissions, updateRolePermissions } = useAuth();
  const [selectedRole, setSelectedRole] = useState<AppRole>("school_admin");
  const [expandedModule, setExpandedModule] = useState<PermissionModule | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "compare">("detail");
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canEdit = user?.role === "school_admin" || user?.role === "super_admin";
  const selectedMeta = ROLE_META[selectedRole];

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const handlePermissionToggle = async (module: PermissionModule, action: PermissionAction) => {
    if (updatingRole) return;

    if (!canEdit) {
      showError("You do not have permission to modify roles.");
      return;
    }

    // Safeguard: prevent lockout
    if (selectedRole === user?.role && module === "settings" && action === "view") {
      showError("Accidental Lockout Protection: You cannot disable 'view' permission for 'settings' on your own role.");
      return;
    }

    setUpdatingRole(selectedRole);
    try {
      const currentRolePerms = (permissions && permissions[selectedRole]) || ROLE_PERMISSIONS[selectedRole] || {};
      const updatedModulePerms = Array.isArray(currentRolePerms[module])
        ? [...currentRolePerms[module]]
        : [];

      if (updatedModulePerms.includes(action)) {
        const idx = updatedModulePerms.indexOf(action);
        updatedModulePerms.splice(idx, 1);
      } else {
        updatedModulePerms.push(action);
      }

      const updatedRolePerms = {
        ...currentRolePerms,
        [module]: updatedModulePerms,
      };

      await updateRolePermissions(selectedRole, updatedRolePerms as Record<string, string[]>);
      showSuccess(`Permissions updated successfully for ${ROLE_META[selectedRole].label}.`);
    } catch (err: any) {
      console.error(err);
      showError(err.message || "Failed to update permissions.");
    } finally {
      setUpdatingRole(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative pb-20">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure or view access levels for each role in your school management system.
          </p>
        </div>

        {/* Current user badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 w-fit">
          <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="text-[12px] text-slate-600 dark:text-slate-400">
            You are logged in as{" "}
            <span className={`font-semibold ${roleIconBg[user?.role as AppRole]?.split(" ")[1] ?? "text-slate-900 dark:text-white"}`}>
              {ROLE_META[user?.role as AppRole]?.label ?? user?.role}
            </span>
          </span>
        </div>
      </div>

      {/* ── Role Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ALL_ROLES.map((role) => (
          <RoleCard
            key={role}
            role={role}
            isSelected={selectedRole === role}
            onClick={() => {
              setSelectedRole(role);
              setExpandedModule(null);
            }}
            permissions={permissions}
          />
        ))}
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 border border-border rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("detail")}
          className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${activeTab === "detail"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-transparent"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
            }`}
        >
          Role Detail
        </button>
        <button
          onClick={() => setActiveTab("compare")}
          className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-all ${activeTab === "compare"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-transparent"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
            }`}
        >
          Compare All Roles
        </button>
      </div>

      {activeTab === "detail" ? (
        /* ── Detail Panel ────────────────────────────────────────────── */
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
          {/* Selected Role Header */}
          <div className={`px-6 py-5 bg-gradient-to-r ${roleGradients[selectedRole]} border-b border-border`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-white/50 dark:bg-transparent ${roleIconBg[selectedRole]}`}>
                  {roleIcons[selectedRole]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedMeta.label}</h2>
                  <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-0.5">{selectedMeta.description}</p>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/30 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50 w-fit">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {countPermissions(selectedRole, permissions)}
                  </span>{" "}
                  total permissions
                </span>
              </div>
            </div>
          </div>

          {/* Permissions Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/60">
                <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Module
                </th>
                <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Allowed Actions
                </th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map((module) => (
                <ModuleRow
                  key={module}
                  module={module}
                  role={selectedRole}
                  isExpanded={expandedModule === module}
                  onToggle={() =>
                    setExpandedModule(expandedModule === module ? null : module)
                  }
                  permissions={permissions}
                  onPermissionToggle={handlePermissionToggle}
                  isUpdating={updatingRole === selectedRole}
                  canEdit={canEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Comparison Panel ────────────────────────────────────────── */
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/60">
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">All Roles — Side by Side Comparison</h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              ✓ means at least view access. Check the "Role Detail" tab to update permissions.
            </p>
          </div>
          <ComparisonTable permissions={permissions} />
        </div>
      )}

      {/* ── Info Note ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
          {canEdit ? (
            <span>
              As an Administrator, you can customize the roles' access by expanding any module under the{" "}
              <strong>Role Detail</strong> tab and toggling actions. Changes will apply immediately to all active users of that role.
            </span>
          ) : (
            <span>
              Permissions are managed by the school administrator. Contact your Principal or School Admin to request changes to role-based access levels.
            </span>
          )}
        </p>
      </div>

      {/* ── Floating status alerts (Toasts) ───────────────────────────── */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
          <Check className="w-4 h-4 shrink-0 stroke-[3]" />
          <span className="text-[13px] font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
          <Info className="w-4 h-4 shrink-0 stroke-[3]" />
          <span className="text-[13px] font-medium">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
