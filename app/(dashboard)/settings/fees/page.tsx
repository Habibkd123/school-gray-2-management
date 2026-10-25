"use client";

import React from "react";
import Link from "next/link";
import FinanceSettingsTab from "../components/FinanceSettingsTab";

export default function SettingsFeesPage() {
  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="page-header mb-2">
        <div>
          <h1 className="page-title">Finance Settings</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/settings/profile" className="hover:text-primary">Settings</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Finance</span>
          </div>
        </div>
      </div>

      <FinanceSettingsTab defaultSubTab="class-fees" />
    </div>
  );
}
