"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useAuth } from "../../context/auth";
import { Loader2 } from "lucide-react";

// Dynamically import role dashboards to code-split routes and keep bundle size lightweight
const SuperAdminDashboard = dynamic(() => import("../../components/dashboard/SuperAdminDashboard"), {
  loading: () => <DashboardLoader />,
});
const AdminDashboard = dynamic(() => import("../../components/dashboard/AdminDashboard"), {
  loading: () => <DashboardLoader />,
});
const TeacherDashboard = dynamic(() => import("../../components/dashboard/TeacherDashboard"), {
  loading: () => <DashboardLoader />,
});
const StudentDashboard = dynamic(() => import("../../components/dashboard/StudentDashboard"), {
  loading: () => <DashboardLoader />,
});
const ParentDashboard = dynamic(() => import("../../components/dashboard/ParentDashboard"), {
  loading: () => <DashboardLoader />,
});

function DashboardLoader() {
  return (
    <div className="p-6 text-slate-500 flex items-center gap-2 justify-center min-h-[400px] dark:text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span>Loading dashboard panels...</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? "school_admin";

  return (
    <div className="space-y-6 max-w-full sm:w-[1600px] mx-auto">
      {/* Global Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {role === "super_admin"
              ? "Super Admin Console"
              : role === "school_admin" || role === "accountant"
                ? "Admin Dashboard"
                : role === "teacher"
                  ? "Teacher Dashboard"
                  : role === "parent"
                    ? "Parent Portal"
                    : "Student Dashboard"}
          </h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200">
              Overview
            </span>
          </div>
        </div>
      </div>

      {/* Render matching dashboard panel based on user session role */}
      {role === "super_admin" && <SuperAdminDashboard user={user} />}
      {(role === "school_admin" || role === "accountant") && <AdminDashboard user={user} />}
      {role === "teacher" && <TeacherDashboard user={user} />}
      {role === "student" && <StudentDashboard user={user} />}
      {role === "parent" && <ParentDashboard />}
    </div>
  );
}
