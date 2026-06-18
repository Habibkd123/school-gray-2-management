"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStudentAuth } from "../context/studentAuth";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  FileText,
  ClipboardList,
  Award,
  CheckSquare,
  PalmtreeIcon,
  CreditCard,
  Megaphone,
  LogOut,
  X,
  GraduationCap,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/routine", label: "My Routine", icon: CalendarDays },
  { href: "/student/subjects", label: "My Subjects", icon: BookOpen },
  { href: "/student/homework", label: "Homework", icon: FileText },
  { href: "/student/exams", label: "Exam Schedule", icon: ClipboardList },
  { href: "/student/results", label: "My Results", icon: Award },
  { href: "/student/attendance", label: "My Attendance", icon: CheckSquare },
  { href: "/student/leave", label: "Apply Leave", icon: PalmtreeIcon },
  { href: "/student/fees", label: "My Fees", icon: CreditCard },
  { href: "/student/notices", label: "Notice Board", icon: Megaphone },
];

interface StudentSidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

export function StudentSidebar({ isMobileOpen, onClose }: StudentSidebarProps) {
  const pathname = usePathname();
  const { user, studentProfile, logout } = useStudentAuth();

  const classInfo =
    studentProfile?.class_id &&
    typeof studentProfile.class_id === "object"
      ? `${studentProfile.class_id.name} ${studentProfile.class_id.section}`
      : "—";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 lg:z-auto
          h-screen w-72 flex-shrink-0
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{
          background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #1e1b4b 100%)",
        }}
      >
        {/* ── Logo / Branding ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 0 20px rgba(99,102,241,0.5)",
              }}
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">
                {process.env.NEXT_PUBLIC_SCHOOL_NAME || "School ERP"}
              </p>
              <p className="text-[10px] text-indigo-300 font-medium">Student Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Student Profile Card ──────────────────────────────────── */}
        <div className="px-4 py-4 mx-3 mt-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              {studentProfile?.photo_url ? (
                <img
                  src={studentProfile.photo_url}
                  alt={user?.name}
                  className="w-11 h-11 rounded-xl object-cover ring-2 ring-indigo-400/40"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg ring-2 ring-indigo-400/40"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)" }}
                >
                  {(user?.name || "S").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#1e1b4b]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{user?.name || "Student"}</p>
              <p className="text-[11px] text-indigo-300 truncate">{classInfo}</p>
              {studentProfile?.roll_no && (
                <p className="text-[10px] text-indigo-400">Roll: {studentProfile.roll_no}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Navigation ────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  relative flex items-center gap-3 px-4 py-2.5 rounded-xl
                  text-[13px] font-medium transition-all duration-200 group
                  ${
                    isActive
                      ? "text-white"
                      : "text-indigo-300 hover:text-white hover:bg-white/5"
                  }
                `}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))",
                        boxShadow: "0 0 15px rgba(99,102,241,0.2)",
                      }
                    : {}
                }
              >
                {/* Active indicator */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #6366f1, #a78bfa)",
                      boxShadow: "0 0 8px rgba(99,102,241,0.8)",
                    }}
                  />
                )}
                <div
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
                    ${isActive ? "bg-indigo-500/30" : "bg-white/5 group-hover:bg-white/10"}
                  `}
                >
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-indigo-300" : "text-current"}`}
                  />
                </div>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-400 hover:text-white hover:bg-rose-500/20 transition-all duration-200 text-[13px] font-medium group"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/25 flex items-center justify-center transition-all">
              <LogOut className="w-4 h-4" />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
