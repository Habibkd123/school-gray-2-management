"use client";

import React from "react";
import { BarChart3, Download, Search, Settings2 } from "lucide-react";

export default function AttendanceReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Attendance Reports</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Attendance</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Reports</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-10 flex flex-col items-center justify-center text-center card-shadow h-[400px]">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Reports Dashboard</h2>
        <p className="text-slate-500 max-w-md text-[14px] dark:text-slate-400">
          The comprehensive reporting module is scheduled for the next phase. It will include daily, monthly, and low-attendance reports with export capabilities.
        </p>
      </div>
    </div>
  );
}
