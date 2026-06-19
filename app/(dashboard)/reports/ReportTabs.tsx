"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const REPORT_TABS = [
  { label: "Attendance Report",       href: "/reports/attendance-report" },
  { label: "Students Attendance Type", href: "/reports/students-attendance-type" },
  { label: "Daily Attendance",        href: "/reports/daily-attendance" },
  { label: "Student Day Wise",        href: "/reports/student-day-wise" },
  { label: "Teacher Day Wise",        href: "/reports/teacher-day-wise" },
  { label: "Teacher Report",          href: "/reports/teacher-report" },
];

export default function ReportTabs() {
  const pathname = usePathname();

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-border overflow-x-auto -mx-6 px-6 mb-6">
      <nav className="flex items-center gap-0 min-w-max">
        {REPORT_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                relative px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors
                ${isActive
                  ? "text-[#F59E0B] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#F59E0B] after:rounded-t"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
