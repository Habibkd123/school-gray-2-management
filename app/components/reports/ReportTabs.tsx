"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ReportTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Attendance Report", href: "/reports/attendance-report" },
    { name: "Students Attendance Type", href: "/reports/students-attendance-type" },
    { name: "Daily Attendance", href: "/reports/daily-attendance" },
    { name: "Student Day Wise", href: "/reports/student-day-wise" },
    { name: "Teacher Day Wise", href: "/reports/teacher-day-wise" },
    { name: "Teacher Report", href: "/reports/teacher-report" },
  ];

  return (
    <div className="flex items-center gap-6 border-b border-border mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={`pb-3 text-[14px] font-medium transition-colors relative ${isActive ? "text-primary" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
              }`}
          >
            {tab.name}
            {isActive && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-t-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
