"use client";

import React, { useState } from "react";
import {
  Wallet,
  Building2,
  Users,
  GraduationCap,
  Layers,
  CreditCard,
  Clock,
  DollarSign,
  Calendar as CalendarIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  FileText,
  CircleDollarSign,
  User as UserIcon,
  PieChart as PieChartIcon,
  Grid,
} from "lucide-react";

export interface AnalyticsData {
  summary?: any;
  adminGrowth?: any[];
  enrollmentTrends?: any[];
  feeAnalytics?: any;
  salaryAnalytics?: any;
  documentTracking?: any;
  recentActivities?: any[];
}

interface SuperAdminChartsProps {
  analytics?: AnalyticsData | null;
  loading?: boolean;
}

// ── Reusable Circular Gauge Ring ──
function CircularGauge({
  percent,
  color = "#FB923C",
  size = 64,
  strokeWidth = 4,
}: {
  percent: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">
        {percent}%
      </span>
    </div>
  );
}

// ── Reusable Multi-Segment Donut Chart ──
function DonutChart({
  segments,
  size = 110,
  strokeWidth = 14,
}: {
  segments: { percent: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90 shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-100 dark:text-slate-800"
        fill="transparent"
      />
      {segments.map((seg, idx) => {
        const segCirc = (seg.percent / 100) * circumference;
        const strokeDasharray = `${segCirc} ${circumference}`;
        const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
        accumulatedPercent += seg.percent;

        return (
          <circle
            key={idx}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700"
          />
        );
      })}
    </svg>
  );
}

export default function SuperAdminCharts({ analytics, loading }: SuperAdminChartsProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string>("Jul");

  // Monthly dual-bar data (Jan to Dec)
  const monthlyBarData = [
    { month: "Jan", collection: 3.8, expense: 3.2, maxCap: 6 },
    { month: "Feb", collection: 3.9, expense: 3.1, maxCap: 6 },
    { month: "Mar", collection: 4.0, expense: 3.2, maxCap: 6 },
    { month: "Apr", collection: 4.1, expense: 3.2, maxCap: 6 },
    { month: "May", collection: 3.9, expense: 3.0, maxCap: 6 },
    { month: "Jun", collection: 4.0, expense: 3.1, maxCap: 6 },
    { month: "Jul", collection: 3.8, expense: 3.2, maxCap: 6 },
    { month: "Aug", collection: 3.9, expense: 3.1, maxCap: 6 },
    { month: "Sep", collection: 3.9, expense: 3.1, maxCap: 6 },
    { month: "Oct", collection: 4.0, expense: 3.2, maxCap: 6 },
    { month: "Nov", collection: 4.0, expense: 3.2, maxCap: 6 },
    { month: "Dec", collection: 1.8, expense: 2.8, maxCap: 6 },
  ];

  // Annual session line trend data (Jan to Dec)
  const lineData = [
    { month: "Jan", collection: 1.5, expense: 1.3, x: 25 },
    { month: "Feb", collection: 1.3, expense: 1.1, x: 75 },
    { month: "Mar", collection: 2.1, expense: 1.6, x: 125 },
    { month: "Apr", collection: 2.4, expense: 1.0, x: 175 },
    { month: "May", collection: 3.9, expense: 1.4, x: 225 },
    { month: "Jun", collection: 3.4, expense: 2.2, x: 275 },
    { month: "Jul", collection: 4.6, expense: 2.9, x: 325 }, // Highlighted in screenshot: July: 2.9
    { month: "Aug", collection: 3.4, expense: 2.0, x: 375 },
    { month: "Sep", collection: 4.7, expense: 2.7, x: 425 },
    { month: "Oct", collection: 3.4, expense: 1.4, x: 475 },
    { month: "Nov", collection: 1.4, expense: 1.7, x: 525 },
    { month: "Dec", collection: 2.2, expense: 1.5, x: 575 },
  ];

  // SVG coordinate mapper for line chart
  const getY = (val: number) => 180 - ((val - 1.0) / 5.0) * 150;
  const collectionPoints = lineData.map((d) => `${d.x},${getY(d.collection)}`).join(" ");
  const expensePoints = lineData.map((d) => `${d.x},${getY(d.expense)}`).join(" ");

  // Income Donut Segments
  const incomeSegments = [
    { label: "Donation", percent: 42, color: "#10B981" },
    { label: "Rent", percent: 22, color: "#818CF8" },
    { label: "Miscellaneous", percent: 14, color: "#F472B6" },
    { label: "Uniform Sale", percent: 12, color: "#38BDF8" },
    { label: "Book Sale", percent: 10, color: "#E2E8F0" },
  ];

  // Expense Donut Segments
  const expenseSegments = [
    { label: "Stationery Purchase", percent: 36, color: "#34D399" },
    { label: "Electricity Bill", percent: 24, color: "#60A5FA" },
    { label: "Telephone Bill", percent: 18, color: "#C084FC" },
    { label: "Miscellaneous", percent: 12, color: "#F87171" },
    { label: "Flower / Maintenance", percent: 10, color: "#FB923C" },
  ];

  return (
    <div className="font-roboto text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row gap-5">
        
        {/* LEFT COLUMN (Approx 35% width) */}
        <div className="w-full lg:w-[35%] flex flex-col gap-5">
          
          {/* Card 1: Fees Awaiting Payment */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6" />
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-[13px] font-semibold mb-1">
                Fees Awaiting Payment
              </span>
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                14 <span className="text-slate-400 text-xl font-bold">/ 238</span>
              </span>
            </div>
            <CircularGauge percent={5.9} color="#F59E0B" size={86} strokeWidth={5} />
          </div>

          {/* Card 2: Student Count */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-950/30 text-fuchsia-500 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 dark:text-slate-400 text-[13px] font-semibold mb-1">
                Student Count
              </span>
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                54
              </span>
            </div>
          </div>

          {/* Card 3: Fees Overview (Horizontal Progress Bars) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex-1 flex flex-col min-h-[260px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                </div>
                <span className="font-bold text-[15px] text-slate-800 dark:text-white">
                  Fees Overview
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">April 2025</span>
            </div>
            
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              {/* Due Amount */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Due Amount</span>
                  <span className="text-slate-700 dark:text-slate-300">90.76%</span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-700"
                    style={{ width: "90.76%" }}
                  />
                </div>
              </div>
              
              {/* Paid Amount */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Paid Amount</span>
                  <span className="text-slate-700 dark:text-slate-300">55.32%</span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-300 rounded-full transition-all duration-700"
                    style={{ width: "55.32%" }}
                  />
                </div>
              </div>
              
              {/* Balance */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Balance</span>
                  <span className="text-slate-700 dark:text-slate-300">19.12%</span>
                </div>
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-amber-300 rounded-full transition-all duration-700"
                    style={{ width: "19.12%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Approx 65% width) */}
        <div className="w-full lg:w-[65%] flex flex-col gap-5">
          
          {/* Card 4: Income Donut Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                  <CircleDollarSign className="w-4 h-4 text-slate-400" />
                </div>
                <span className="font-bold text-[15px] text-slate-800 dark:text-white">
                  Income
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400">April 2025</span>
            </div>
            
            <div className="flex items-center justify-around flex-1 mt-2">
              <div className="relative">
                <DonutChart segments={incomeSegments} size={140} strokeWidth={18} />
              </div>
              <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                {incomeSegments.map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-md shrink-0 shadow-xs" style={{ backgroundColor: s.color }} />
                    <span className="tracking-wide">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 5: Fees Collection & Expenses Dual Bar Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                  <PieChartIcon className="w-4 h-4 text-slate-400" />
                </div>
                <span className="font-bold text-[15px] text-slate-800 dark:text-white">
                  Fees Collection &amp; Expenses
                </span>
                <span className="text-xs font-semibold text-slate-400 ml-2">in 1000s</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-800">
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-stretch flex-1 min-h-[260px] pt-2">
              {/* Y Axis Labels */}
              <div className="flex flex-col justify-between text-[11px] text-slate-400 font-bold pr-5 select-none pb-8">
                <span>6k</span>
                <span>5k</span>
                <span>4k</span>
                <span>3k</span>
                <span>2k</span>
                <span>1k</span>
                <span>0</span>
              </div>

              {/* Bars Container */}
              <div className="flex-1 flex items-end justify-between pb-8 border-b-2 border-slate-100 dark:border-slate-800 relative px-2">
                {monthlyBarData.map((d) => {
                  const collectionHeightPct = (d.collection / d.maxCap) * 100;
                  const expenseHeightPct = (d.expense / d.maxCap) * 100;

                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Hover Tooltip */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs font-bold rounded-lg px-3 py-1.5 shadow-lg pointer-events-none whitespace-nowrap z-20">
                        {d.month}: Coll ${d.collection}k | Exp ${d.expense}k
                      </div>

                      {/* Dual Bars inside subtle container */}
                      <div className="w-full flex items-end justify-center gap-1.5 h-full relative">
                        {/* Green Bar (Collection) */}
                        <div className="w-3 sm:w-4 lg:w-5 h-full relative flex flex-col justify-end">
                          <div className="absolute inset-0 w-full border border-dashed border-slate-200 dark:border-slate-700 rounded-t pointer-events-none" />
                          <div
                            className="w-full bg-emerald-400 dark:bg-emerald-500 rounded-t transition-all duration-500 group-hover:bg-emerald-300"
                            style={{ height: `${collectionHeightPct}%` }}
                          />
                        </div>

                        {/* Pink/Coral Bar (Expense) */}
                        <div className="w-3 sm:w-4 lg:w-5 h-full relative flex flex-col justify-end">
                          <div
                            className="w-full bg-rose-300 dark:bg-rose-400/90 rounded-t transition-all duration-500 group-hover:bg-rose-200"
                            style={{ height: `${expenseHeightPct}%` }}
                          />
                        </div>
                      </div>

                      {/* X Axis Label */}
                      <span className="text-[11px] font-bold text-slate-400 mt-4 absolute -bottom-8">
                        {d.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: 4 METRIC CAPSULES (Network Growth & Staffing)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
        {/* New Admins */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">New Admins (Last Month)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">12</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +4.2%
              </span>
            </div>
          </div>
        </div>

        {/* New Students */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">New Students (Last Year)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">1,402</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +12%
              </span>
            </div>
          </div>
        </div>

        {/* Teacher Salaries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Monthly Teacher Salary</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">$42.5k</span>
            </div>
          </div>
        </div>

        {/* Daily Documents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Schools Daily Documents</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">845</span>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                Verified
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* ─────────────────────────────────────────────────────────────
          ROW 3: COMPLIANCE & FULL TRACKING
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        {/* Document Tracking / Compliance */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <span className="font-bold text-[15px] text-slate-800 dark:text-white">
                Network Document Compliance
              </span>
            </div>
            <button className="text-xs font-bold text-blue-500 hover:text-blue-600">View All</button>
          </div>
          
          <div className="space-y-6 flex-1 flex flex-col justify-center pb-2">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500 dark:text-slate-400">KYC & Registration Complete</span>
                <span className="text-slate-700 dark:text-slate-300">85%</span>
              </div>
              <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: "85%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500 dark:text-slate-400">Pending Financial Audits</span>
                <span className="text-slate-700 dark:text-slate-300">22%</span>
              </div>
              <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: "22%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500 dark:text-slate-400">Missing Staff Credentials</span>
                <span className="text-slate-700 dark:text-slate-300">12%</span>
              </div>
              <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-400 rounded-full transition-all duration-700" style={{ width: "12%" }} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Staff Attendance Line Trend */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <span className="font-bold text-[15px] text-slate-800 dark:text-white">
                Teacher & Staff Attendance Tracking
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400">Current Week</span>
          </div>
          
          <div className="flex items-stretch flex-1 min-h-[160px] pt-2 relative">
             <div className="flex flex-col justify-between text-[11px] text-slate-400 font-bold pr-5 select-none pb-8">
               <span>100%</span>
               <span>75%</span>
               <span>50%</span>
             </div>
             
             <div className="flex-1 relative pb-8">
                {/* Grid Lines */}
                <div className="absolute inset-0 pb-8 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b-2 border-slate-100 dark:border-slate-800 w-full" />
                  <div className="border-b-2 border-slate-100 dark:border-slate-800 w-full" />
                  <div className="border-b-2 border-slate-100 dark:border-slate-800 w-full" />
                </div>
                
                {/* Smooth Area Chart */}
                <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
                   <linearGradient id="purpleGradient" x1="0" x2="0" y1="0" y2="1">
                     <stop offset="0%" stopColor="#C084FC" stopOpacity="0.4" />
                     <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
                   </linearGradient>
                   
                   <path 
                     d="M0,120 L0,30 Q50,10 100,50 T200,60 T300,20 T400,50 T500,40 L500,120 Z" 
                     fill="url(#purpleGradient)" 
                   />
                   <path 
                     d="M0,30 Q50,10 100,50 T200,60 T300,20 T400,50 T500,40" 
                     fill="none" 
                     stroke="#A855F7" 
                     strokeWidth="4" 
                     strokeLinecap="round" 
                   />
                   
                   {/* Data points */}
                   <circle cx="100" cy="50" r="4" fill="#FFFFFF" stroke="#A855F7" strokeWidth="2" />
                   <circle cx="200" cy="60" r="4" fill="#FFFFFF" stroke="#A855F7" strokeWidth="2" />
                   <circle cx="300" cy="20" r="4" fill="#FFFFFF" stroke="#A855F7" strokeWidth="2" />
                   <circle cx="400" cy="50" r="4" fill="#FFFFFF" stroke="#A855F7" strokeWidth="2" />
                   <circle cx="500" cy="40" r="4" fill="#FFFFFF" stroke="#A855F7" strokeWidth="2" />
                </svg>
                
                {/* X Axis Label */}
                <div className="absolute -bottom-1 inset-x-0 flex justify-between text-[11px] font-bold text-slate-400 px-1">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
