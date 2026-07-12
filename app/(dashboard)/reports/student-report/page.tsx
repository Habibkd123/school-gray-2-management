"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Calendar, Loader2, X, Award, BookOpen, User, CheckCircle
} from "lucide-react";
import { useStudents } from "../../../hooks/useStudents";
import { useClasses } from "../../../hooks/useClasses";
import { getAuthHeaders } from "@/lib/utils/session";
import ReportTabs from "../ReportTabs";
import { PrintService } from "@/app/lib/print-service";

export default function StudentReportPage() {
  const { students, isLoading, fetchStudents } = useStudents();
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [joinStartDate, setJoinStartDate] = useState("");
  const [joinEndDate, setJoinEndDate] = useState("");
  const [sortOption, setSortOption] = useState<"name" | "roll" | "join">("name");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Student Details Modal States
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "tests" | "homework">("overview");

  const sections = useMemo(() => {
    const list = new Set(classes.map((c) => c.section).filter(Boolean));
    return Array.from(list) as string[];
  }, [classes]);

  const getClassName = (class_id: any) => {
    if (!class_id) return "—";
    if (typeof class_id === "object") return `${class_id?.name} ${class_id?.section}`;
    const cls = classes.find((c) => c._id === class_id);
    return cls ? `${cls.name} ${cls.section}` : "—";
  };

  const filteredData = useMemo(() => {
    let list = students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.admission_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.roll_no || "").toLowerCase().includes(searchTerm.toLowerCase());

      const classId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      const cls = classes.find((c) => c._id === classId);

      const matchClass = !filterClass || classId === filterClass;
      const matchSection = !filterSection || (cls && cls.section === filterSection);
      const matchGender = !filterGender || (s.gender || "").toLowerCase() === filterGender.toLowerCase();
      const matchStatus = !filterStatus || (filterStatus === "active" ? s.is_active : !s.is_active);

      // Date Range Filter on Join Date
      let matchJoinDate = true;
      if (s.admission_date) {
        const joinDate = new Date(s.admission_date);
        if (joinStartDate) {
          matchJoinDate = matchJoinDate && joinDate >= new Date(joinStartDate);
        }
        if (joinEndDate) {
          matchJoinDate = matchJoinDate && joinDate <= new Date(joinEndDate + "T23:59:59");
        }
      } else if (joinStartDate || joinEndDate) {
        matchJoinDate = false;
      }

      return matchSearch && matchClass && matchSection && matchGender && matchStatus && matchJoinDate;
    });

    // Sorting
    if (sortOption === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "roll") {
      list.sort((a, b) => (a.roll_no || "").localeCompare(b.roll_no || ""));
    } else if (sortOption === "join") {
      list.sort((a, b) => new Date(a.admission_date || 0).getTime() - new Date(b.admission_date || 0).getTime());
    }

    return list;
  }, [students, searchTerm, filterClass, filterSection, filterGender, filterStatus, joinStartDate, joinEndDate, sortOption, classes]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

  // Fetch Student Detailed Report Card
  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/reports/student/${selectedStudentId}`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          setStudentDetail(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
    setActiveTab("overview");
  }, [selectedStudentId]);

  const handleExport = (format: "csv" | "excel") => {
    if (filteredData.length === 0) {
      alert("No data available to export");
      return;
    }
    const headers = [
      "Admission No",
      "Roll No",
      "Name",
      "Class",
      "Gender",
      "Guardian",
      "Date of Join",
      "DOB",
      "Status"
    ];
    const rows = filteredData.map((s) => [
      s.admission_no || s._id.slice(-6).toUpperCase(),
      s.roll_no || "—",
      s.name,
      getClassName(s.class_id),
      s.gender || "—",
      s.guardian_name || "—",
      s.admission_date ? new Date(s.admission_date).toLocaleDateString() : "—",
      s.dob ? new Date(s.dob).toLocaleDateString() : "—",
      s.is_active ? "Active" : "Inactive"
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `student_report_${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "xls"}`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const printReport = () => {
    PrintService.print('printable-area', { pageSize: 'A4' });
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="print:hidden">
        <ReportTabs />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Student Report</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchStudents()}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* <button
            onClick={() => PrintService.print('printable-area', { pageSize: 'A4' })}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button> */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export{" "}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF/CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left print:hidden">
        {[
          { label: "Total Students", value: students.length, color: "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30" },
          { label: "Active", value: students.filter((s) => s.is_active).length, color: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" },
          { label: "Inactive", value: students.filter((s) => !s.is_active).length, color: "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" },
          { label: "Classes", value: classes.length, color: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" }
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm">
            <p className={`text-2xl font-bold border rounded-lg px-3 py-1.5 inline-block mb-2 ${card.color}`}>
              {card.value}
            </p>
            <p className="card-subtitle text-[13px] font-semibold">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left print:hidden">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Student Report List</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Filter className="w-4 h-4 text-slate-400" /> Filter{" "}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
                          <select
                            value={filterClass}
                            onChange={(e) => {
                              setFilterClass(e.target.value);
                              setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          >
                            <option value="">All</option>
                            {classes.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name} {c.section}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Section</label>
                          <select
                            value={filterSection}
                            onChange={(e) => {
                              setFilterSection(e.target.value);
                              setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          >
                            <option value="">All</option>
                            {sections.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Gender</label>
                          <select
                            value={filterGender}
                            onChange={(e) => {
                              setFilterGender(e.target.value);
                              setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          >
                            <option value="">All</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
                          <select
                            value={filterStatus}
                            onChange={(e) => {
                              setFilterStatus(e.target.value);
                              setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      {/* Date of Join Range */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Date of Join Range</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={joinStartDate}
                            onChange={(e) => {
                              setJoinStartDate(e.target.value);
                              setPage(1);
                            }}
                            className="w-1/2 px-2.5 py-1.5 border border-border rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="date"
                            value={joinEndDate}
                            onChange={(e) => {
                              setJoinEndDate(e.target.value);
                              setPage(1);
                            }}
                            className="w-1/2 px-2.5 py-1.5 border border-border rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 border-t border-border">
                      <button
                        onClick={() => {
                          setFilterClass("");
                          setFilterSection("");
                          setFilterGender("");
                          setFilterStatus("");
                          setJoinStartDate("");
                          setJoinEndDate("");
                          setPage(1);
                        }}
                        className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="px-5 py-2.5 bg-primary text-white text-[13px] font-bold rounded-lg cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <List className="w-4 h-4 text-slate-400" /> Sort <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                    {[
                      { label: "A–Z Name", val: "name" },
                      { label: "Admission No", val: "roll" },
                      { label: "Date of Join", val: "join" }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => {
                          setSortOption(opt.val as any);
                          setIsSortOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-[14px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left font-medium cursor-pointer"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="card-subtitle text-[13px]">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredData.length}</span> of {students.length}
          </span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, admission no, roll no..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-4 py-2 w-full sm:w-[280px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Admission No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Name</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Gender</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Guardian</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((s) => (
                  <tr
                    key={s._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-primary">
                      {s.admission_no || s._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.roll_no || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px] flex-shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-foreground dark:text-slate-100">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getClassName(s.class_id)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 capitalize">{s.gender || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.guardian_name || "—"}</td>
                    <td className="px-6 py-4">
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedStudentId(s._id)}
                        className="px-3.5 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors shadow-sm border border-[#E2E8F0] dark:border-slate-700 cursor-pointer"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-border flex items-center justify-end gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="card-subtitle px-3 py-1.5 text-[13px] hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-[13px] font-medium flex items-center justify-center ${page === p
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="card-subtitle px-3 py-1.5 text-[13px] hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Student Details Report Card Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:relative print:inset-auto print:bg-transparent print:p-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-left border border-border print:border-none print:shadow-none print:max-h-none print:overflow-visible">
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-800/50 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
                  Detailed Academic Report Card
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {/* <button
                  onClick={printReport}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-border text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button> */}
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer dark:text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0">
              {detailLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Fetching academic profile data...</p>
                </div>
              ) : !studentDetail ? (
                <div className="py-20 text-center text-slate-500">Failed to load detailed stats.</div>
              ) : (
                <div className="space-y-6">
                  {/* Print Friendly Header */}
                  <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-4 mb-4">
                    <div>
                      <h2 className="section-title">Academic Progress Report Card</h2>
                      <p className="text-xs text-slate-500">MySchoolLife Student Management System</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{studentDetail.profile.name}</p>
                      <p className="text-xs text-slate-500">Admission No: {studentDetail.profile.admissionNo}</p>
                    </div>
                  </div>

                  {/* 1. Student Profile Banner */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-[13px]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                        {studentDetail.profile.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[15px] text-slate-800 dark:text-slate-100">{studentDetail.profile.name}</h4>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-bold">Student Profile</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs uppercase font-bold">Academic Details</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Class: <span className="font-bold text-primary">{studentDetail.profile.className} {studentDetail.profile.section}</span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">Roll No: {studentDetail.profile.rollNo} | Adm No: {studentDetail.profile.admissionNo}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs uppercase font-bold">Personal info</p>
                      <p className="text-slate-600 dark:text-slate-300">Gender: <span className="capitalize">{studentDetail.profile.gender}</span></p>
                      <p className="text-slate-600 dark:text-slate-300">DOB: {studentDetail.profile.dob ? new Date(studentDetail.profile.dob).toLocaleDateString("en-GB") : "—"}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs uppercase font-bold">Guardian & Contact</p>
                      <p className="text-slate-600 dark:text-slate-300">{studentDetail.profile.guardianName}</p>
                      <p className="text-slate-600 dark:text-slate-300">Ph: {studentDetail.profile.guardianPhone}</p>
                    </div>
                  </div>

                  {/* 2. Overall Performance Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Attendance Score Card */}
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Attendance Rate</span>
                        <Calendar className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="page-title text-emerald-600">{studentDetail.attendance.rate}%</span>
                        <span className="text-xs text-slate-400 font-medium">({studentDetail.attendance.present} / {studentDetail.attendance.workingDays} Days)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${studentDetail.attendance.rate}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Absent: {studentDetail.attendance.absent}</span>
                        <span>Leaves: {studentDetail.attendance.leave}</span>
                        <span>Late: {studentDetail.attendance.late}</span>
                      </div>
                    </div>

                    {/* Test Average Score Card */}
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Assessment Avg</span>
                        <Award className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="page-title text-indigo-600">{studentDetail.tests.averageScore}%</span>
                        <span className="text-xs text-slate-400 font-medium">({studentDetail.tests.totalTaken} Tests taken)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${studentDetail.tests.averageScore}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">Weighted average across all regular assessments</p>
                    </div>

                    {/* Homework Completion Score Card */}
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Homework Done</span>
                        <BookOpen className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="page-title text-amber-600">{studentDetail.homework.rate}%</span>
                        <span className="text-xs text-slate-400 font-medium">({studentDetail.homework.submitted} / {studentDetail.homework.assigned} Assigned)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-50 rounded-full" style={{ width: `${studentDetail.homework.rate}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                        <span>Submitted: {studentDetail.homework.submitted}</span>
                        <span>Pending: {studentDetail.homework.pending}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Detailed Tabs (Tab selection) */}
                  <div className="border-b border-border flex gap-1 print:hidden">
                    {[
                      { id: "overview", label: "Academic Summary" },
                      { id: "tests", label: "Test Results & Marks" },
                      { id: "homework", label: "Homework Log" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${activeTab === t.id
                          ? "border-primary text-primary"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Details Render */}

                  {/* T1. Academic Summary Overview (Also printed as default page block) */}
                  {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia && window.matchMedia("print").matches) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-1">
                      {/* Class Test Summaries */}
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm text-left">
                        <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-2.5 mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary" /> Recent Test Scores
                        </h4>
                        {studentDetail.tests.list.length === 0 ? (
                          <p className="text-xs text-slate-400 py-6 text-center">No assessment records found.</p>
                        ) : (
                          <div className="space-y-3.5">
                            {studentDetail.tests.list.slice(0, 4).map((t: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <div>
                                  <p className="font-bold text-slate-700 dark:text-slate-200">{t.title}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{t.subject} • {t.testDate ? new Date(t.testDate).toLocaleDateString("en-GB") : ""}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{t.marksObtained} / {t.totalMarks}</p>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.isPass ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                                    {t.isPass ? "PASS" : "FAIL"} ({t.percentage}%)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Homework Summaries */}
                      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm text-left">
                        <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-2.5 mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" /> Active Homework status
                        </h4>
                        {studentDetail.homework.list.length === 0 ? (
                          <p className="text-xs text-slate-400 py-6 text-center">No homework tasks mapped.</p>
                        ) : (
                          <div className="space-y-3.5">
                            {studentDetail.homework.list.slice(0, 4).map((hw: any, i: number) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <div>
                                  <p className="font-bold text-slate-700 dark:text-slate-200">{hw.title}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{hw.subject} • Due: {new Date(hw.dueDate).toLocaleDateString("en-GB")}</p>
                                </div>
                                <div>
                                  {hw.isSubmitted ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                      <CheckCircle className="w-3 h-3" /> Submitted
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                      Pending
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* T2. Complete Test Results list */}
                  {activeTab === "tests" && (
                    <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="erp-table text-[13px] whitespace-nowrap">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-border">
                            <tr>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Assessment Name</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Subject</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Date</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Marks Obtained</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Total Marks</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Percentage</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {studentDetail.tests.list.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No test marks entered.</td>
                              </tr>
                            ) : (
                              studentDetail.tests.list.map((t: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{t.title}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{t.subject}</td>
                                  <td className="px-5 py-3 text-slate-500 font-sans">
                                    {t.testDate ? new Date(t.testDate).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-slate-800 dark:text-slate-200 font-bold">{t.marksObtained}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{t.totalMarks}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-bold font-sans">{t.percentage}%</td>
                                  <td className="px-5 py-3">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.isPass ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                                      }`}>
                                      {t.isPass ? "Pass" : "Fail"}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* T3. Complete Homework Tasks log */}
                  {activeTab === "homework" && (
                    <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="erp-table text-[13px] whitespace-nowrap">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-border">
                            <tr>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Homework Task</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Subject</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Assigned</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Due Date</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Status</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Score/Grade</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Feedback</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {studentDetail.homework.list.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No homework tasks.</td>
                              </tr>
                            ) : (
                              studentDetail.homework.list.map((hw: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{hw.title}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{hw.subject}</td>
                                  <td className="px-5 py-3 text-slate-500 font-sans">
                                    {hw.assignedDate ? new Date(hw.assignedDate).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-slate-500 font-sans">
                                    {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3">
                                    {hw.isSubmitted ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                                        <CheckCircle className="w-3.5 h-3.5" /> Submitted
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-slate-800 dark:text-slate-100 font-bold">{hw.grade || "—"}</td>
                                  <td className="px-5 py-3 text-slate-500 truncate max-w-xs">{hw.feedback || "—"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-800/50 flex justify-end print:hidden">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="px-5 py-2.5 bg-primary text-white text-[13px] font-bold rounded-lg cursor-pointer hover:bg-primary/95 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
