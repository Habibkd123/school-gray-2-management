"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, List, Filter, ChevronDown, RefreshCw, Printer, Download, FileText, Loader2, X, Calendar, Award, BookOpen, User, Users, CheckCircle
} from "lucide-react";
import { useTeachers } from "../../../hooks/useTeachers";
import { getAuthHeaders } from "@/lib/utils/session";
import ReportTabs from "../ReportTabs";

interface TeacherRecentAttendanceMap {
  [teacherId: string]: string[];
}

export default function TeacherReportPage() {
  const { teachers, isLoading, fetchTeachers } = useTeachers({ skip: true });
  const [attendanceMap, setAttendanceMap] = useState<TeacherRecentAttendanceMap>({});
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [joinStartDate, setJoinStartDate] = useState("");
  const [joinEndDate, setJoinEndDate] = useState("");
  const [sortOption, setSortOption] = useState<"name" | "employee_id">("name");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Teacher details modal states
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [teacherDetail, setTeacherDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "classes" | "tests" | "homework">("overview");

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const res = await fetch(`/api/reports/attendance?type=teacher-recent`, {
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (json.success) {
        const map: TeacherRecentAttendanceMap = {};
        json.data.forEach((item: any) => {
          map[item.teacherId] = item.history;
        });
        setAttendanceMap(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchAttendance();
  }, []);

  // Fetch Teacher detailed report dashboard stats
  useEffect(() => {
    if (!selectedTeacherId) {
      setTeacherDetail(null);
      return;
    }

    const fetchTeacherStats = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/reports/teacher/${selectedTeacherId}`, {
          headers: getAuthHeaders()
        });
        const data = await res.json();
        if (data.success) {
          setTeacherDetail(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchTeacherStats();
    setActiveTab("overview");
  }, [selectedTeacherId]);

  const departments = useMemo(() => {
    const deps = new Set(teachers.map((t) => t.department).filter(Boolean));
    return Array.from(deps) as string[];
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    let list = teachers.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.employee_id || t._id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = !filterDepartment || t.department === filterDepartment;
      const matchStatus = !filterStatus || (filterStatus === "active" ? t.is_active : !t.is_active);

      let matchJoinDate = true;
      if (t.join_date) {
        const joinDate = new Date(t.join_date);
        if (joinStartDate) {
          matchJoinDate = matchJoinDate && joinDate >= new Date(joinStartDate);
        }
        if (joinEndDate) {
          matchJoinDate = matchJoinDate && joinDate <= new Date(joinEndDate + "T23:59:59");
        }
      } else if (joinStartDate || joinEndDate) {
        matchJoinDate = false;
      }

      return matchSearch && matchDept && matchStatus && matchJoinDate;
    });

    if (sortOption === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "employee_id") {
      list.sort((a, b) => (a.employee_id || "").localeCompare(b.employee_id || ""));
    }

    return list;
  }, [teachers, searchTerm, filterDepartment, filterStatus, joinStartDate, joinEndDate, sortOption]);

  const totalPages = Math.ceil(filteredTeachers.length / PAGE_SIZE);

  const paginatedTeachers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTeachers.slice(start, start + PAGE_SIZE);
  }, [filteredTeachers, page]);

  const handleExport = (format: "csv" | "excel") => {
    if (filteredTeachers.length === 0) {
      alert("No data available to export");
      return;
    }
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Qualification",
      "Designation",
      "Phone",
      "Email",
      "Status"
    ];
    const rows = filteredTeachers.map((t) => [
      t.employee_id || t._id.slice(-6).toUpperCase(),
      t.name,
      t.department || "—",
      t.qualification || "—",
      "Teacher",
      t.phone || "—",
      t.email || "—",
      t.is_active ? "Active" : "Inactive"
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
      `teacher_report_${new Date().toISOString().slice(0, 10)}.${format === "csv" ? "csv" : "xls"}`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const getRecentAttendance = (teacherId: string) => {
    return attendanceMap[teacherId] || ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A", "N/A"];
  };

  const handleRefresh = () => {
    fetchTeachers();
    fetchAttendance();
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="print:hidden">
        <ReportTabs />
      </div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Report</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Reports</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Teacher Report</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.print()}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400"
          >
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
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
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF/CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left print:hidden">
        <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Teacher Report List</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Filter className="w-4 h-4 text-slate-400" /> Filter{" "}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-76 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-foreground dark:text-slate-100">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Department</label>
                        <select
                          value={filterDepartment}
                          onChange={(e) => {
                            setFilterDepartment(e.target.value);
                            setPage(1);
                          }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="">All Departments</option>
                          {departments.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
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
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Date of Joining Range</label>
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
                          setFilterDepartment("");
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
                      { label: "Employee ID", val: "employee_id" }
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

        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredTeachers.length}</span> teachers
          </span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search teacher..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Teacher</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Department</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Qualification</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Recent Attendance (7 Days)</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : paginatedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((t) => {
                  const recentAtt = getRecentAttendance(t._id);
                  return (
                    <tr
                      key={t._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[12px] flex-shrink-0">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground dark:text-slate-100">{t.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{t.employee_id || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.department || "—"}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{t.qualification || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {recentAtt.map((status, i) => (
                            <div
                              key={i}
                              title={status}
                              className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                                status.toLowerCase() === "present"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : status.toLowerCase() === "absent"
                                  ? "bg-rose-100 text-rose-700"
                                  : status.toLowerCase() === "late"
                                  ? "bg-amber-100 text-amber-700"
                                  : status.toLowerCase() === "leave"
                                  ? "bg-violet-100 text-violet-700"
                                  : status.toLowerCase() === "half_day"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {status.toLowerCase() === "present"
                                ? "P"
                                : status.toLowerCase() === "absent"
                                ? "A"
                                : status.toLowerCase() === "late"
                                ? "L"
                                : status.toLowerCase() === "leave"
                                ? "LV"
                                : status.toLowerCase() === "half_day"
                                ? "H"
                                : "—"}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {t.is_active ? (
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
                          onClick={() => setSelectedTeacherId(t._id)}
                          className="px-4 py-1.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[13px] font-bold rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors shadow-sm border border-[#E2E8F0] dark:border-slate-700 cursor-pointer"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })
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
              className="px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors dark:text-slate-400"
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
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors dark:text-slate-400"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Teacher Details Report Card Modal */}
      {selectedTeacherId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:relative print:inset-auto print:bg-transparent print:p-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-left border border-border print:border-none print:shadow-none print:max-h-none print:overflow-visible">
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between border-b border-border bg-slate-50/50 dark:bg-slate-800/50 print:hidden">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
                  Detailed Faculty Report Card
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-border text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setSelectedTeacherId(null)}
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
                  <p className="text-sm font-medium">Fetching faculty profile...</p>
                </div>
              ) : !teacherDetail ? (
                <div className="py-20 text-center text-slate-500">Failed to load detailed profile.</div>
              ) : (
                <div className="space-y-6">
                  {/* Print Title Header */}
                  <div className="hidden print:flex items-center justify-between border-b border-slate-300 pb-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Faculty Academic Profile & Performance Report</h2>
                      <p className="text-xs text-slate-500">MySchoolLife Management System</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{teacherDetail.profile.name}</p>
                      <p className="text-xs text-slate-500">Emp ID: {teacherDetail.profile.employeeId}</p>
                    </div>
                  </div>

                  {/* 1. Teacher Profile Banner */}
                  <div className="bg-slate-50 dark:bg-slate-800/30 border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4 text-[13px]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                        {teacherDetail.profile.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[15px] text-slate-800 dark:text-slate-100">{teacherDetail.profile.name}</h4>
                        <span className="text-xs text-slate-400 uppercase tracking-wide font-bold">Faculty Member</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs uppercase font-bold">Department Info</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Dept: <span className="font-bold text-primary">{teacherDetail.profile.department}</span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">Qual: {teacherDetail.profile.qualification}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs uppercase font-bold">Contact Info</p>
                      <p className="text-slate-600 dark:text-slate-300">Email: {teacherDetail.profile.email}</p>
                      <p className="text-slate-600 dark:text-slate-300">Phone: {teacherDetail.profile.phone}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs uppercase font-bold">Employment details</p>
                      <p className="text-slate-600 dark:text-slate-300">Joined: {teacherDetail.profile.joinDate ? new Date(teacherDetail.profile.joinDate).toLocaleDateString("en-GB") : "—"}</p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Status: <span className={`font-bold ${teacherDetail.profile.isActive ? "text-emerald-600" : "text-rose-600"}`}>{teacherDetail.profile.isActive ? "Active" : "Inactive"}</span>
                      </p>
                    </div>
                  </div>

                  {/* 2. Key Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Attendance Card */}
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Attendance Rate</span>
                        <Calendar className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-emerald-600">{teacherDetail.attendance.rate}%</span>
                        <span className="text-xs text-slate-400 font-medium">({teacherDetail.attendance.present} / {teacherDetail.attendance.workingDays} days present)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${teacherDetail.attendance.rate}%` }} />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Absent: {teacherDetail.attendance.absent}</span>
                        <span>Leaves: {teacherDetail.attendance.leave}</span>
                        <span>Late: {teacherDetail.attendance.late}</span>
                      </div>
                    </div>

                    {/* Tests Created Card */}
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Tests Scheduled</span>
                        <Award className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-indigo-600">{teacherDetail.tests.totalCreated}</span>
                        <span className="text-xs text-slate-400 font-medium">Class tests created</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: "100%" }} />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">Test assessments created for classroom evaluation</p>
                    </div>

                    {/* Homework Given Card */}
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Homeworks Given</span>
                        <BookOpen className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-amber-600">{teacherDetail.homework.totalGiven}</span>
                        <span className="text-xs text-slate-400 font-medium">Assignments published</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: "100%" }} />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">Academic homework assignments allocated to students</p>
                    </div>
                  </div>

                  {/* 3. Modal Menu Tabs */}
                  <div className="border-b border-border flex gap-1 print:hidden">
                    {[
                      { id: "overview", label: "Assigned Classes" },
                      { id: "tests", label: "Tests Scheduled" },
                      { id: "homework", label: "Homework History" }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                          activeTab === t.id
                            ? "border-primary text-primary"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Render Details */}

                  {/* T1. Assigned Classes */}
                  {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia && window.matchMedia("print").matches) && (
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm text-left">
                      <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 border-b border-border pb-2.5 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Classes & Subjects Mapping
                      </h4>
                      {teacherDetail.assignments.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center font-medium">No assigned classes found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-[13px] whitespace-nowrap text-left">
                            <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-border">
                              <tr>
                                <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Class Name</th>
                                <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Section</th>
                                <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Subject Mapped</th>
                                <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Subject Code</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {teacherDetail.assignments.map((a: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{a.className}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-bold">{a.section}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{a.subjectName}</td>
                                  <td className="px-5 py-3 text-slate-500 font-mono">{a.subjectCode || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* T2. Tests list */}
                  {activeTab === "tests" && (
                    <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[13px] whitespace-nowrap text-left">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-border">
                            <tr>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Assessment Title</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Subject</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Class</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Test Date</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Total Marks</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Passing Marks</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {teacherDetail.tests.list.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No scheduled tests found.</td>
                              </tr>
                            ) : (
                              teacherDetail.tests.list.map((t: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{t.title}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{t.subject}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-bold">{t.className} - {t.section}</td>
                                  <td className="px-5 py-3 text-slate-500 font-mono">
                                    {t.testDate ? new Date(t.testDate).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-bold">{t.totalMarks}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-bold">{t.passingMarks}</td>
                                  <td className="px-5 py-3">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 capitalize">{t.status}</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* T3. Homework Given list */}
                  {activeTab === "homework" && (
                    <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[13px] whitespace-nowrap text-left">
                          <thead className="bg-[#F8FAFC] dark:bg-slate-800 border-b border-border">
                            <tr>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Homework Title</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Subject</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Class</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Assigned</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Due Date</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Submissions</th>
                              <th className="px-5 py-3 font-bold text-slate-700 dark:text-slate-200">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {teacherDetail.homework.list.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No homework tasks mapped.</td>
                              </tr>
                            ) : (
                              teacherDetail.homework.list.map((hw: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">{hw.title}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{hw.subject}</td>
                                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-bold">{hw.className} - {hw.section}</td>
                                  <td className="px-5 py-3 text-slate-500 font-mono">
                                    {hw.assignedDate ? new Date(hw.assignedDate).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-slate-500 font-mono">
                                    {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString("en-GB") : "—"}
                                  </td>
                                  <td className="px-5 py-3 font-bold text-indigo-600">{hw.submissionsCount}</td>
                                  <td className="px-5 py-3">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 capitalize">{hw.status}</span>
                                  </td>
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
                onClick={() => setSelectedTeacherId(null)}
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
