"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HIDE_FEES_FEATURE } from "@/lib/permissions";
import { useAppState } from "../../context/store";
import {
  Search,
  Users,
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  ClipboardList,
  DollarSign,
  Megaphone,
  UserCheck,
  Zap
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string[];
}

export function CommandMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { setRole, students, teachers } = useAppState();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const SHOW_FEES = !HIDE_FEES_FEATURE;
  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-dash", title: "Go to Dashboard Overview", category: "Navigation", icon: <Zap className="w-4 h-4" />, action: () => { router.push("/dashboard"); setIsOpen(false); } },
    { id: "nav-stu", title: "Go to Students Directory", category: "Navigation", icon: <GraduationCap className="w-4 h-4" />, action: () => { router.push("/students"); setIsOpen(false); } },
    { id: "nav-tea", title: "Go to Teachers Directory", category: "Navigation", icon: <Users className="w-4 h-4" />, action: () => { router.push("/teachers"); setIsOpen(false); } },
    { id: "nav-cla", title: "Go to Classes & Schedule", category: "Navigation", icon: <Calendar className="w-4 h-4" />, action: () => { router.push("/classes"); setIsOpen(false); } },
    { id: "nav-att", title: "Go to Attendance Register", category: "Navigation", icon: <Clock className="w-4 h-4" />, action: () => { router.push("/attendance/student"); setIsOpen(false); } },
    { id: "nav-hw", title: "Go to Homework & Assignments", category: "Navigation", icon: <BookOpen className="w-4 h-4" />, action: () => { router.push("/homework"); setIsOpen(false); } },
    { id: "nav-res", title: "Go to Exams & Results", category: "Navigation", icon: <ClipboardList className="w-4 h-4" />, action: () => { router.push("/results"); setIsOpen(false); } },
    { id: "nav-fee", title: "Go to Billing & Fees Portal", category: "Navigation", icon: <DollarSign className="w-4 h-4" />, action: () => { router.push("/fees"); setIsOpen(false); } },
    { id: "nav-not", title: "Go to Notice Board Announcements", category: "Navigation", icon: <Megaphone className="w-4 h-4" />, action: () => { router.push("/notices"); setIsOpen(false); } },

    // Role Switching
    { id: "role-adm", title: "Switch active role to Admin", category: "Role Selection", icon: <UserCheck className="w-4 h-4 text-indigo-500" />, action: () => { setRole("admin"); router.push("/dashboard"); setIsOpen(false); } },
    { id: "role-tea", title: "Switch active role to Teacher", category: "Role Selection", icon: <UserCheck className="w-4 h-4 text-emerald-500" />, action: () => { setRole("teacher"); router.push("/dashboard"); setIsOpen(false); } },
    { id: "role-stu", title: "Switch active role to Student", category: "Role Selection", icon: <UserCheck className="w-4 h-4 text-amber-500" />, action: () => { setRole("student"); router.push("/dashboard"); setIsOpen(false); } },
  ].filter(c => SHOW_FEES || c.id !== "nav-fee");

  // Dynamic additions based on search results for students/teachers
  const dynamicStudents: CommandItem[] = search.trim().length > 1
    ? students
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 3)
        .map(s => ({
          id: `stu-${s.id}`,
          title: `View Student: ${s.name} (${s.rollNo})`,
          category: "Students Search",
          icon: <GraduationCap className="w-4 h-4 text-zinc-400" />,
          action: () => { router.push(`/students?id=${s.id}`); setIsOpen(false); }
        }))
    : [];

  const dynamicTeachers: CommandItem[] = search.trim().length > 1
    ? teachers
        .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 3)
        .map(t => ({
          id: `tea-${t.id}`,
          title: `View Teacher: ${t.name} - ${t.subject}`,
          category: "Teachers Search",
          icon: <Users className="w-4 h-4 text-zinc-400" />,
          action: () => { router.push(`/teachers?id=${t.id}`); setIsOpen(false); }
        }))
    : [];

  const allItems = [...dynamicStudents, ...dynamicTeachers, ...commands];
  const filteredItems = allItems.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Grouped commands
  const categories = Array.from(new Set(filteredItems.map(item => item.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Box */}
      <div
        className="relative w-full max-w-xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-md transition-all overflow-hidden flex flex-col max-h-[50vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-zinc-100 dark:border-zinc-800">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-4 text-sm bg-transparent border-0 outline-none text-zinc-900 dark:text-zinc-50 placeholder-zinc-400"
          />
          <kbd className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded select-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
              No results found for &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map(category => (
                <div key={category} className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {category}
                  </div>
                  {filteredItems
                    .filter(item => item.category === category)
                    .map((item) => {
                      const absoluteIndex = filteredItems.indexOf(item);
                      const isActive = absoluteIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-active={isActive}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(absoluteIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                            isActive
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium"
                              : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={isActive ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}>
                              {item.icon}
                            </span>
                            <span>{item.title}</span>
                          </div>
                          {item.shortcut && (
                            <div className="flex items-center gap-1">
                              {item.shortcut.map(s => (
                                <kbd key={s} className="px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded">
                                  {s}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
