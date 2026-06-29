"use client";

import React, { useState, useMemo } from "react";
import {
  Search, List, ChevronDown, RefreshCw, Printer, Download, FileText, X, Loader2
} from "lucide-react";
import { useClasses } from "../../../hooks/useClasses";
import { useStudents } from "../../../hooks/useStudents";

export default function ClassReportPage() {
  const { classes, isLoading, fetchClasses } = useClasses();
  const { students, fetchStudents } = useStudents();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<"A–Z" | "Most Students" | "Least Students">("A–Z");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const getStudentsInClass = (classId: string) =>
    students.filter(s => {
      const cid = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      return cid === classId;
    });

  const sortedClasses = useMemo(() => {
    const list = classes.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c._id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedSort === "A–Z") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (selectedSort === "Most Students") {
      list.sort((a, b) => getStudentsInClass(b._id).length - getStudentsInClass(a._id).length);
    } else if (selectedSort === "Least Students") {
      list.sort((a, b) => getStudentsInClass(a._id).length - getStudentsInClass(b._id).length);
    }

    return list;
  }, [classes, searchTerm, selectedSort, students]);

  const totalPages = Math.ceil(sortedClasses.length / PAGE_SIZE);
  
  const paginatedClasses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedClasses.slice(start, start + PAGE_SIZE);
  }, [sortedClasses, page]);

  const selectedClass = classes.find(c => c._id === selectedClassId);
  const modalStudents = selectedClassId ? getStudentsInClass(selectedClassId) : [];

  const handleRefresh = () => {
    fetchClasses();
    fetchStudents();
  };

  const handleExport = () => {
    if (sortedClasses.length === 0) {
      alert("No class records available to export.");
      return;
    }

    // Convert to CSV format
    const headers = ["Class ID", "Class Name", "Section", "Number of Students"];
    const rows = sortedClasses.map(c => [
      c._id.slice(-6).toUpperCase(),
      c.name,
      c.section,
      getStudentsInClass(c._id).length
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `class_report_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Class Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <span className="hover:text-primary cursor-pointer">Reports</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleRefresh} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"><Printer className="w-4 h-4" /></button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button onClick={() => { handleExport(); setIsExportOpen(false); }} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as CSV</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        {[
          { label: "Total Classes", value: classes.length, color: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30" },
          { label: "Total Students", value: students.length, color: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" },
          { label: "Avg per Class", value: classes.length ? Math.round(students.length / classes.length) : 0, color: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-bold border rounded-lg px-3 py-1.5 inline-block mb-2 ${card.color}`}>{card.value}</p>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Class Report List</h2>
          <div className="relative">
            <button onClick={() => setIsSortOpen(!isSortOpen)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <List className="w-4 h-4 text-slate-400" /> Sort: {selectedSort} <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                  {(["A–Z", "Most Students", "Least Students"] as const).map(opt => (
                    <button key={opt} onClick={() => { setSelectedSort(opt); setPage(1); setIsSortOpen(false); }} className={`w-full px-4 py-2.5 text-[14px] hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left font-medium cursor-pointer ${selectedSort === opt ? "text-primary" : "text-slate-700 dark:text-slate-200"}`}>{opt}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="p-5 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{sortedClasses.length}</span> classes</span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search class or section…" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12"><input type="checkbox" className="rounded border-slate-300 text-primary" /></th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">ID</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Section</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">No of Students</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : paginatedClasses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400">No classes found.</td></tr>
              ) : paginatedClasses.map(cls => (
                <tr key={cls._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-slate-300 text-primary" /></td>
                  <td className="px-6 py-4 font-semibold text-primary">{cls._id.slice(-6).toUpperCase()}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls.name}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls.section}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getStudentsInClass(cls._id).length}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelectedClassId(cls._id)} className="px-4 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-md hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors shadow-sm border border-[#E2E8F0] dark:border-slate-700 cursor-pointer">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-5 border-t border-border flex items-center justify-end gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-[13px] font-medium flex items-center justify-center ${
                  page === p
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Students Modal */}
      {selectedClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-left border border-border">
            <div className="p-5 flex items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
                {selectedClass?.name} {selectedClass?.section} — Students ({modalStudents.length})
              </h3>
              <button onClick={() => setSelectedClassId(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-[13px] whitespace-nowrap">
                <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] sticky top-0 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Admission No</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Name</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Gender</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Guardian</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">DOB</th>
                    <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modalStudents.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No students in this class.</td></tr>
                  ) : modalStudents.map(s => (
                    <tr key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{s.admission_no || s._id.slice(-6).toUpperCase()}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.roll_no || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">{s.name.charAt(0)}</div>
                          <span className="font-semibold text-foreground dark:text-slate-100">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{s.gender || "—"}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.guardian_name || "—"}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.dob ? new Date(s.dob).toLocaleDateString("en-GB") : "—"}</td>
                      <td className="px-6 py-4">
                        {s.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" />Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-border bg-white dark:bg-slate-900 flex justify-end">
              <button onClick={() => setSelectedClassId(null)} className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-lg cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
