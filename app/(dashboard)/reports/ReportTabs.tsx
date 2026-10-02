"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const REPORT_TABS = [
  { label: "Daily Attendance Report",  href: "/reports/daily-attendance" },
  { label: "Monthly Attendance Report", href: "/reports/attendance-report" },
  { label: "Student Report",          href: "/reports/student-report" },
  { label: "Teacher Report",          href: "/reports/teacher-report" },
  { label: "Class Report",            href: "/reports/class-report" },
  { label: "Finance Report",          href: "/reports/finance" },
  { label: "Exam Report",             href: "/reports/examination-reports" },
];

export default function ReportTabs() {
  return null;
}
