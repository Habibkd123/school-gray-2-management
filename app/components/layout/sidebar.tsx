"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/auth";
import {
  LayoutDashboard, Users, GraduationCap, Calendar, Clock, BookOpen,
  ClipboardList, Megaphone, ChevronDown, ChevronRight, Building2,
  BarChart, LogOut, User, ChevronUp, Menu, Bus, X
} from "lucide-react";

// Map DB roles → sidebar role key
function mapRole(role?: string): "super_admin" | "admin" | "accountant" | "teacher" | "student" | "parent" {
  if (role === "super_admin") return "super_admin";
  if (role === "school_admin") return "admin";
  if (role === "teacher") return "teacher";
  if (role === "accountant") return "accountant";
  if (role === "parent") return "parent";
  return "student";
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const activeRole = mapRole(user?.role);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const superAdminLinks = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "All Schools", href: "/schools", icon: <Building2 className="w-4 h-4" /> },
  ];

  const adminLinks = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Students", href: "/students", icon: <GraduationCap className="w-4 h-4" /> },
    { name: "Teachers", href: "/teachers", icon: <Users className="w-4 h-4" /> },
    { name: "Parents", href: "/guardians", icon: <User className="w-4 h-4" /> },
    {
      name: "Classes & HRM", icon: <Calendar className="w-4 h-4" />, subItems: [
        { name: "All Classes", href: "/classes" },
        { name: "Schedule", href: "/classes/schedule" },
        { name: "Approve Leave Request", href: "/leave/approve-leave-request" },
        { name: "Leave Type", href: "/leave/leave-type" },
        { name: "Holidays", href: "/holidays" }
      ]
    },
    {
      name: "Academic", icon: <Building2 className="w-4 h-4" />, subItems: [
        { name: "Class Room", href: "/academic/class-room" },
        { name: "Class Routine", href: "/academic/class-routine" },
        { name: "Sections", href: "/academic/sections" },
        { name: "Subjects", href: "/academic/subjects" },
        { name: "Class Syllabus", href: "/academic/class-syllabus" },
        { name: "Time Table", href: "/academic/time-table" },
        { name: "Class Home Work", href: "/academic/class-home-work" },
        { name: "Progress & Grading", href: "/academic/progress" }
      ]
    },
    {
      name: "Examination", icon: <ClipboardList className="w-4 h-4" />, subItems: [
        { name: "Exam", href: "/examination/exam" },
        { name: "Exam Schedule", href: "/examination/exam-schedule" },
        { name: "Grade", href: "/examination/grade" },
        { name: "Exam Attendance", href: "/examination/exam-attendance" },
        { name: "Marks Entry", href: "/examination/marks-entry" },
        { name: "Exam Results", href: "/examination/exam-results" }
      ]
    },
    {
      name: "Attendance", icon: <Clock className="w-4 h-4" />, subItems: [
        { name: "Teacher Attendance List", href: "/attendance/teacher-attendance" },
        { name: "Student Attendance List", href: "/attendance/student-attendance" }
      ]
    },

    // ── Fees Collection hidden (Issue 9) ──────────────────────────────
    {
      name: "Transport", href: "/transport/bus-details", icon: <Bus className="w-4 h-4" />,
      // subItems: [
      //   { name: "Bus Details", href: "/transport/bus-details" },
      //   { name: "Route Management", href: "/transport/route-management" },
      //   { name: "Student Allocation", href: "/transport/allocation" }
      // ]
    },
    {
      name: "Reports", icon: <BarChart className="w-4 h-4" />, subItems: [
        { name: "Daily Attendance Report", href: "/reports/daily-attendance" },
        { name: "Monthly Attendance Report", href: "/reports/attendance-report" },
        // Fees Report hidden (Issue 9)
        { name: "Examination Reports", href: "/reports/examination-reports" },
        { name: "Merit List", href: "/reports/merit-list" },
        { name: "Student Report", href: "/reports/student-report" },
        { name: "Class Report", href: "/reports/class-report" },
        { name: "Grade Report", href: "/reports/grade-report" },
        { name: "Leave Report", href: "/reports/leave-report" }
      ]
    },
    { name: "Notice Board", href: "/notices", icon: <Megaphone className="w-4 h-4" /> },
    {
      name: "Settings", icon: <User className="w-4 h-4" />, subItems: [
        { name: "Profile", href: "/settings/profile" },
        { name: "Roles & Permissions", href: "/settings/roles" }
      ]
    }
  ];

  const teacherLinks = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      name: "Classes & Schedule", icon: <Calendar className="w-4 h-4" />, subItems: [
        { name: "My Classes", href: "/classes" },
        { name: "Schedule", href: "/classes/schedule" }
      ]
    },
    {
      name: "Academic", icon: <Building2 className="w-4 h-4" />, subItems: [
        { name: "Class Syllabus", href: "/academic/class-syllabus" },
        { name: "Home Work", href: "/academic/class-home-work" },
        { name: "Progress & Grading", href: "/academic/progress" }
      ]
    },
    {
      name: "Examination", icon: <ClipboardList className="w-4 h-4" />, subItems: [
        { name: "Exam Schedule", href: "/examination/exam-schedule" },
        { name: "Grades", href: "/examination/grade" },
        { name: "Exam Attendance", href: "/examination/exam-attendance" },
        { name: "Marks Entry", href: "/examination/marks-entry" },
        { name: "Exam Results", href: "/examination/exam-results" }
      ]
    },
    {
      name: "Attendance", icon: <Clock className="w-4 h-4" />, subItems: [
        { name: "Student Attendance", href: "/attendance/student-attendance" },
        { name: "My Attendance", href: "/attendance/my-attendance" }
      ]
    },
    {
      name: "Leave", href: "/leave/apply", icon: <Calendar className="w-4 h-4" />,
      // subItems: [
      //   { name: "Apply Leave", href: "/leave/apply" }
      // ]
    },
    { name: "Notice Board", href: "/notices", icon: <Megaphone className="w-4 h-4" /> }
  ];

  const parentLinks = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Attendance", href: "/parent/attendance", icon: <Clock className="w-4 h-4" /> },
    // Fees Status hidden (Issue 9)
    { name: "Result View", href: "/parent/results", icon: <ClipboardList className="w-4 h-4" /> },
    { name: "Homework View", href: "/parent/homework", icon: <BookOpen className="w-4 h-4" /> },
    { name: "Notifications", href: "/notices", icon: <Megaphone className="w-4 h-4" /> }
  ];

  const studentLinks = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      name: "Academic", icon: <Building2 className="w-4 h-4" />, subItems: [
        { name: "My Routine", href: "/academic/class-routine" },
        { name: "My Syllabus", href: "/academic/class-syllabus" },
        { name: "My Subjects", href: "/academic/subjects" },
        { name: "Home Work", href: "/academic/class-home-work" },
        { name: "Progress & Grading", href: "/academic/progress" }
      ]
    },
    {
      name: "Examination", href: "/examination/exam-schedule", icon: <ClipboardList className="w-4 h-4" />, subItems: [
        { name: "Exam Schedule", href: "/examination/exam-schedule" },
        { name: "My Grades", href: "/examination/exam-results" }
      ]
    },
    {
      name: "Attendance", href: "/attendance/my-attendance", icon: <Clock className="w-4 h-4" />,
      // subItems: [
      // { name: "My Attendance",  }
      // ]
    },
    {
      name: "Leave", href: "/leave/apply", icon: <Calendar className="w-4 h-4" />,
      // subItems: [
      //   { name: "Apply Leave", href: "/leave/apply" }
      // ]
    },

    // Fees link hidden — Issue 9
    { name: "Notice Board", href: "/notices", icon: <Megaphone className="w-4 h-4" /> }
  ];

  const accountantLinks = [
    { name: "Overview", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    // ── Accountant Fees Collection hidden (Issue 9) ──────────────────────
    {
      name: "Reports", icon: <BarChart className="w-4 h-4" />, subItems: [
        // Fees Report hidden (Issue 9)
      ]
    },
    { name: "Notice Board", href: "/notices", icon: <Megaphone className="w-4 h-4" /> }
  ];

  const links =
    activeRole === "super_admin" ? superAdminLinks
      : activeRole === "admin" ? adminLinks
        : activeRole === "teacher" ? teacherLinks
          : activeRole === "accountant" ? accountantLinks
            : activeRole === "parent" ? parentLinks
              : studentLinks;

  const roleLabels: Record<"super_admin" | "admin" | "accountant" | "teacher" | "student" | "parent", { text: string; badge: string }> = {
    super_admin: { text: "Super Admin", badge: "bg-amber-500/20 text-amber-400" },
    admin: { text: "Principal / Admin", badge: "bg-blue-500/20 text-blue-400" },
    accountant: { text: "Accountant", badge: "bg-yellow-500/20 text-yellow-400" },
    teacher: { text: "Faculty Member", badge: "bg-emerald-500/20 text-emerald-400" },
    parent: { text: "Parent Portal", badge: "bg-purple-500/20 text-purple-400" },
    student: { text: "Student Profile", badge: "bg-amber-500/20 text-amber-400" },
  };

  const [expandedMenu, setExpandedMenu] = React.useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    // Intentionally removed auto-expansion logic so menus are collapsed by default
  }, [pathname]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 md:relative md:flex ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isCollapsed ? 'md:w-[80px]' : 'md:w-[240px]'} w-full sm:w-[240px] bg-sidebar flex flex-col h-full flex-shrink-0 transition-all duration-300 border-r border-slate-800/50`}>
        {/* Branding */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'} border-b border-slate-800/50 mt-2`}>
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center gap-3 pl-2 md:pl-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-white shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white tracking-tight text-[15px]">
                  MySchoolLife
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                  Management
                </span>
              </div>
            </div>
          )}
          
          {/* Collapse toggle for desktop, close button for mobile */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer md:block hidden ${isCollapsed ? 'mx-auto' : ''}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer md:hidden block mr-2"
            title="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation Links */}
      {/* Navigation Links */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 space-y-1 overflow-y-auto`}>
        {!isCollapsed && (
          <div className="px-2 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Main Menu
          </div>
        )}
        {links.map((link) => {
          if ('subItems' in link && link.subItems) {
            const isExpanded = expandedMenu === link.name;
            const isChildActive = link.subItems.some((sub: { href: string }) => pathname === sub.href);
            return (
              <div key={link.name} className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    if (isCollapsed) setIsCollapsed(false);
                    setExpandedMenu(isExpanded && !isCollapsed ? null : link.name);
                  }}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full ${isCollapsed ? 'px-0 py-3' : 'px-3 py-2.5'} text-[13px] rounded-lg transition-all duration-200 font-medium ${isChildActive && !isExpanded
                    ? "bg-primary/10 text-primary"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  title={isCollapsed ? link.name : undefined}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <span className={`${isChildActive ? "text-primary" : "text-slate-400 dark:text-slate-500"}`}>
                      {link.icon}
                    </span>
                    {!isCollapsed && <span>{link.name}</span>}
                  </div>
                  {!isCollapsed && (isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />)}
                </button>

                {isExpanded && !isCollapsed && (
                  <div className="ml-9 flex flex-col gap-1 border-l border-slate-700/50 pl-3 py-1">
                    {link.subItems.map((sub: { name: string, href: string }) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={onClose}
                          className={`text-[12px] font-medium transition-colors py-1.5 ${isSubActive ? "text-primary" : "text-slate-500 dark:text-slate-400 hover:text-slate-300"
                            }`}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = pathname === (link as { href: string }).href;
          return (
            <Link
              key={link.name}
              href={(link as { href: string }).href}
              onClick={onClose}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${isCollapsed ? 'px-0 py-3' : 'px-3 py-2.5'} text-[13px] rounded-lg transition-all duration-200 font-medium ${isActive
                ? "bg-primary/10 text-primary"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              title={isCollapsed ? link.name : undefined}
            >
              <span className={`${isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"}`}>
                {link.icon}
              </span>
              {!isCollapsed && <span>{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Role Indicator Footer & Profile Menu */}
      <div className={`relative ${isCollapsed ? 'p-2' : 'p-4'} border-t border-slate-800/50`}>
        {isProfileMenuOpen && !isCollapsed && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden py-1">
              <Link
                href="/settings/profile"
                onClick={() => { setIsProfileMenuOpen(false); onClose?.(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" /> My Profile
              </Link>
              <div className="h-px w-full bg-slate-700/50 my-1" />
              <button
                onClick={() => { setIsProfileMenuOpen(false); logout(); onClose?.(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-rose-400 hover:text-rose-300 hover:bg-slate-700/50 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => {
            if (isCollapsed) setIsCollapsed(false);
            else setIsProfileMenuOpen(!isProfileMenuOpen);
          }}
          className={`w-full ${isCollapsed ? 'p-2 justify-center' : 'p-3 justify-between'} rounded-xl bg-slate-800/30 border border-slate-700/50 flex items-center hover:bg-slate-800/50 transition-colors cursor-pointer`}
          title={isCollapsed ? (user?.name || roleLabels[activeRole].text) : undefined}
        >
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Logged in as</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleLabels[activeRole].badge}`}>
                    {activeRole.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-semibold text-white truncate max-w-full sm:w-[140px]">
                  {user?.name || roleLabels[activeRole].text}
                </span>
              </div>
              {isProfileMenuOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              )}
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}
