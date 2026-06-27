"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, Map, UserCheck } from "lucide-react";

const tabs = [
  { label: "Bus Details", href: "/transport/bus-details", icon: Bus },
  { label: "Route Management", href: "/transport/route-management", icon: Map },
  { label: "Student Allocation", href: "/transport/allocation", icon: UserCheck },
];

export function TransportTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-border rounded-xl p-1.5 w-fit shadow-sm">
      {tabs.map(({ label, href, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
              isActive
                ? "bg-[#1E3A5F] text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
