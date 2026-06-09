"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useAppState } from "../../context/store";
import { useAuth } from "../../context/auth";
import { Search, Bell, Sun, Moon, Calendar, BarChart2, ChevronDown, LogOut, User, Settings, Shield } from "lucide-react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAcademicYearOpen, setIsAcademicYearOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2024 / 2025");

  // Scroll detection for sticky header styles
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 h-[72px] w-full px-6 flex items-center justify-between transition-all duration-200 ${
        scrolled
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-white dark:bg-slate-900 border-b border-border"
      }`}
    >
      {/* Search Input Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative w-[280px]">
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-4 pr-10 py-2.5 text-[14px] bg-[#F1F5F9] dark:bg-slate-800 border-none rounded-lg outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 bg-[#E2E8F0] dark:bg-slate-700 rounded text-[12px] font-bold text-slate-500">
            ⌘
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Academic Year */}
        <div className="relative">
          <button 
            onClick={() => setIsAcademicYearOpen(!isAcademicYearOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Academic Year : {selectedAcademicYear}</span>
            <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
          </button>
          
          {isAcademicYearOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsAcademicYearOpen(false)} />
              <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1">
                {["2023 / 2024", "2024 / 2025", "2025 / 2026"].map((year) => (
                  <button 
                    key={year}
                    onClick={() => { setSelectedAcademicYear(year); setIsAcademicYearOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-[13px] transition-colors cursor-pointer ${year === selectedAcademicYear ? "bg-[#F59E0B] text-white font-medium" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language (Flag) */}
        <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-[16px] hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors">
          🇺🇸
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-danger rounded-full ring-2 ring-[#F1F5F9] dark:ring-slate-800" />
          </button>
          
          {isNotifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
              <div className="absolute right-0 top-12 w-[380px] bg-white dark:bg-slate-900 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-border z-50 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">Notifications (2)</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#F59E0B] hover:underline cursor-pointer">Mark all as read</span>
                    <button className="flex items-center gap-1 px-2 py-1 bg-[#F1F5F9] dark:bg-slate-800 rounded text-[12px] text-slate-700 dark:text-slate-300">
                      <Calendar className="w-3 h-3" />
                      <span>Today</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {/* Body */}
                <div className="max-h-[360px] overflow-y-auto">
                  {/* Item 1 */}
                  <div className="p-4 border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3">
                    <img src="https://preskool.dreamstechnologies.com/html/assets/img/profiles/avatar-02.jpg" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">Shawn</span> performance in Math is below the threshold.
                      </p>
                      <span className="text-[13px] text-slate-500 mt-1 block">Just Now</span>
                    </div>
                  </div>
                  
                  {/* Item 2 */}
                  <div className="p-4 border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3">
                    <img src="https://preskool.dreamstechnologies.com/html/assets/img/profiles/avatar-03.jpg" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">Sylvia</span> added appointment on 02:00 PM
                      </p>
                      <span className="text-[13px] text-slate-500 mt-1 block">10 mins ago</span>
                      <div className="flex gap-2 mt-2.5">
                        <button className="px-3 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-[13px] font-medium text-slate-700 dark:text-slate-300 rounded hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors">Deny</button>
                        <button className="px-3 py-1.5 bg-[#F59E0B] text-[13px] font-medium text-white rounded hover:bg-[#D97706] transition-colors">Approve</button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Item 3 */}
                  <div className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3">
                    <img src="https://preskool.dreamstechnologies.com/html/assets/img/profiles/avatar-04.jpg" className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        New student record <span className="font-bold text-slate-900 dark:text-white">George</span> is created by <span className="font-bold text-slate-900 dark:text-white">Teressa</span>
                      </p>
                      <span className="text-[13px] text-slate-500 mt-1 block">2 hrs ago</span>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="p-3 border-t border-border flex gap-3">
                  <button onClick={() => setIsNotifOpen(false)} className="flex-1 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[14px] font-medium text-slate-700 dark:text-slate-300 rounded hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors">Cancel</button>
                  <button onClick={() => setIsNotifOpen(false)} className="flex-1 py-2.5 bg-[#F59E0B] text-[14px] font-medium text-white rounded hover:bg-[#D97706] transition-colors">View All</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Chart/Analytics */}
        <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors">
          <BarChart2 className="w-4.5 h-4.5" />
        </button>

        {/* User Avatar + Dropdown */}
        <div className="relative ml-1">
          <button
            id="header-profile-btn"
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
            className="flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-1 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 shrink-0">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "Admin")}&background=5D6BEE&color=fff&bold=true&rounded=false`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden md:flex flex-col items-start">
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {user?.name || "Admin"}
              </span>
              <span className="text-[11px] text-slate-400 capitalize leading-tight">
                {user?.role?.replace("_", " ") || "Admin"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {isProfileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-[220px] bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-border dark:border-slate-800">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                  <p className="text-[12px] text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-[#5D6BEE]/10 text-[11px] font-semibold text-[#5D6BEE] capitalize">
                    <Shield className="w-2.5 h-2.5" />
                    {user?.role?.replace("_", " ")}
                  </span>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/dashboard/settings/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-border dark:border-slate-800 py-1">
                  <button
                    id="header-logout-btn"
                    onClick={() => { setIsProfileOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
