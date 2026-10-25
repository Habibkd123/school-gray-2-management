"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, SlidersHorizontal, Wallet } from "lucide-react";
import ClassFeesSettingsTab from "./ClassFeesSettingsTab";
import FeesManagementView from "../../fees/components/FeesManagementView";
import SalaryDashboardPage from "../../salary/page";

interface FinanceSettingsTabProps {
  defaultSubTab?: "fees" | "salary" | "class-fees";
}

export default function FinanceSettingsTab({ defaultSubTab = "fees" }: FinanceSettingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"fees" | "salary" | "class-fees">(defaultSubTab);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get("sub");
      if (sub === "class-fees" || sub === "class_fees") {
        setActiveSubTab("class-fees");
      } else if (sub === "salary" || sub === "payroll") {
        setActiveSubTab("salary");
      } else if (sub === "fees" || sub === "ledger") {
        setActiveSubTab("fees");
      } else if (defaultSubTab) {
        setActiveSubTab(defaultSubTab);
      }
    }
  }, [defaultSubTab]);

  const handleSubTabChange = (tab: "fees" | "salary" | "class-fees") => {
    setActiveSubTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "finance");
      url.searchParams.set("sub", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Sub-tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/80">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit border border-border/60">
          <button
            type="button"
            id="subtab-finance-fees"
            onClick={() => handleSubTabChange("fees")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "fees"
                ? "bg-white dark:bg-slate-900 text-primary shadow-sm border border-border/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>Fees & Billing Desk</span>
          </button>

          <button
            type="button"
            id="subtab-finance-salary"
            onClick={() => handleSubTabChange("salary")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "salary"
                ? "bg-white dark:bg-slate-900 text-primary shadow-sm border border-border/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Wallet className="w-4 h-4 text-cyan-500" />
            <span>Salary / Payroll</span>
          </button>

          <button
            type="button"
            id="subtab-finance-class-fees"
            onClick={() => handleSubTabChange("class-fees")}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === "class-fees"
                ? "bg-white dark:bg-slate-900 text-primary shadow-sm border border-border/50"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <span>Class Fee Setup</span>
          </button>
        </div>

        <div className="text-[12px] text-slate-500 dark:text-slate-400 hidden sm:block">
          {activeSubTab === "fees"
            ? "Manage student fees, dues ledger, receipts, and financial reports."
            : activeSubTab === "salary"
            ? "Manage employee contracts, payroll disbursements, deductions, and salary slips."
            : "Configure standard fee structures & fee heads per class."}
        </div>
      </div>

      {/* Sub-tab Content */}
      <div className="transition-all duration-150">
        {activeSubTab === "fees" ? (
          <FeesManagementView isEmbedded={true} />
        ) : activeSubTab === "salary" ? (
          <SalaryDashboardPage isEmbedded={true} />
        ) : (
          <ClassFeesSettingsTab />
        )}
      </div>
    </div>
  );
}
