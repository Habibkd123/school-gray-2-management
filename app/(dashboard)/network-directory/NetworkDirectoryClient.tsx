"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  Search,
  Download,
  ExternalLink,
  Phone,
  Eye,
  School,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  MapPin
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";
import { getSubdomainHost } from "@/lib/utils/subdomain";

interface SchoolItem {
  _id: string;
  name: string;
  slug: string;
  subdomain?: string;
  is_active: boolean;
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
}

interface StudentItem {
  _id: string;
  name: string;
  roll_no?: string;
  admission_no?: string;
  gender?: string;
  dob?: string;
  photo_url?: string;
  phone?: string;
  is_active: boolean;
  academic_year?: string;
  school_id: { _id: string; name: string; subdomain?: string; slug?: string } | any;
  class_id?: { _id: string; name: string; section?: string } | any;
  guardian_phone?: string;
}

export default function NetworkDirectoryClient({ user }: { user: any }) {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  const loadSchools = useCallback(() => {
    setLoadingSchools(true);
    fetch("/api/schools", { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setSchools(data.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingSchools(false));
  }, []);

  const loadStudents = useCallback(() => {
    setLoadingStudents(true);
    const params = new URLSearchParams();
    if (selectedSchoolId && selectedSchoolId !== "all") {
      params.set("school_id", selectedSchoolId);
    }
    if (studentSearch.trim()) {
      params.set("search", studentSearch.trim());
    }
    params.set("page", studentPage.toString());
    params.set("limit", "15");

    fetch(`/api/students?${params.toString()}`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setStudents(data.data.students || []);
          setTotalStudents(data.data.total ?? 0);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingStudents(false));
  }, [selectedSchoolId, studentSearch, studentPage]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const networkStats = useMemo(() => {
    const networkStudents = schools.reduce((acc, s) => acc + (s.studentsCount || 0), 0);
    return { networkStudents };
  }, [schools]);

  const handleExportStudentsCSV = () => {
    if (!students || students.length === 0) return;
    const headers = ["Name", "Admission No", "Roll No", "School", "Class", "Gender", "Phone", "Status"];
    const rows = students.map((s) => [
      `"${s.name || ""}"`,
      `"${s.admission_no || ""}"`,
      `"${s.roll_no || ""}"`,
      `"${s.school_id?.name || (typeof s.school_id === "string" ? s.school_id : "")}"`,
      `"${s.class_id?.name || ""}"`,
      `"${s.gender || ""}"`,
      `"${s.phone || s.guardian_phone || ""}"`,
      `"${s.is_active ? "Active" : "Inactive"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `school_students_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="font-sans font-roboto space-y-6 text-slate-800 dark:text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/60" style={{ background: "linear-gradient(135deg, #090D16 0%, #0F172A 50%, #1E1B4B 100%)" }}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-roboto">
              Network Directory & Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl font-normal leading-relaxed">
              Campus-wise student breakdown and multi-campus student directory. Monitor enrollments and directory details across all registered schools.
            </p>
          </div>
        </div>
      </div>

      {/* Campus-Wise Student Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <School className="w-5 h-5 text-amber-500" />
              <span>Campus-Wise Student Breakdown</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              View how student enrollment and teaching staff are distributed across each registered campus.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedSchoolId("all"); setStudentPage(1); document.getElementById("student-directory")?.scrollIntoView({ behavior: "smooth" }); }} className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>View All {networkStats.networkStudents} Students</span>
            </button>
          </div>
        </div>

        {loadingSchools ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-sm font-medium">Loading school enrollments...</span>
          </div>
        ) : schools.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-medium">No registered schools found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schools.map((school) => {
              const sub = school.subdomain || school.slug;
              const percentOfTotal = networkStats.networkStudents > 0 ? Math.round(((school.studentsCount || 0) / networkStats.networkStudents) * 100) : 0;
              return (
                <div key={school._id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-amber-400/50 transition-all flex flex-col justify-between group shadow-xs hover:shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors leading-snug">{school.name}</h3>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{getSubdomainHost(sub, false)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${school.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                        {school.is_active ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <div className="p-3.5 my-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Enrolled Students</span>
                        </div>
                        <span className="text-lg font-black text-slate-900 dark:text-white">{(school.studentsCount || 0).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(percentOfTotal, 3)}%` }} />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-medium">
                        <span>{percentOfTotal}% of total network</span>
                        <span>{school.classesCount || 0} Classes</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-4 px-1">
                      <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-400" /><span>{school.teachersCount || 0} Faculty</span></div>
                      <div className="flex items-center gap-1.5 justify-end"><BookOpen className="w-3.5 h-3.5 text-sky-400" /><span>{school.classesCount || 0} Grades</span></div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button onClick={() => { setSelectedSchoolId(school._id); setStudentPage(1); document.getElementById("student-directory")?.scrollIntoView({ behavior: "smooth" }); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1 cursor-pointer">
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Students ({school.studentsCount || 0})</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Link href={`https://${getSubdomainHost(sub, false)}`} target="_blank" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Campus Student Directory */}
      <div id="student-directory" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 scroll-mt-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-500" />
              <span>Multi-Campus Student Directory</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">{totalStudents} Found</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Filter students by specific school, class, admission number, or search across the entire network.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Filter School:</label>
              <select value={selectedSchoolId} onChange={(e) => { setSelectedSchoolId(e.target.value); setStudentPage(1); }} className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400">
                <option value="all">All Schools ({networkStats.networkStudents} Students)</option>
                {schools.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.studentsCount || 0} students)</option>
                ))}
              </select>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={studentSearch} onChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }} placeholder="Search name, roll, adm no..." className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-400" />
            </div>
            <button onClick={handleExportStudentsCSV} className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5" title="Download CSV">
              <Download className="w-3.5 h-3.5" /><span>Export CSV</span>
            </button>
          </div>
        </div>

        {loadingStudents ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-sm font-medium">Fetching students data...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <GraduationCap className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No students found for this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Campus / School</th>
                  <th className="px-4 py-3">Class &amp; Section</th>
                  <th className="px-4 py-3">Roll &amp; Adm No</th>
                  <th className="px-4 py-3">Gender / DOB</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {students.map((student) => {
                  const schoolName = student.school_id?.name || "School";
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 shrink-0">
                            {student.photo_url ? <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover rounded-full" /> : student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{student.name}</div>
                            <div className="text-[10px] text-slate-400">{student.academic_year || "2024-25"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                          <Building2 className="w-3 h-3 text-indigo-500" /><span>{schoolName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium">{student.class_id?.name || "Class"}{student.class_id?.section ? ` (${student.class_id.section})` : ""}</td>
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        <div>Roll: {student.roll_no || "-"}</div>
                        <div className="text-slate-400 text-[10px]">Adm: {student.admission_no || "-"}</div>
                      </td>
                      <td className="px-4 py-3.5 capitalize text-[11px]">
                        <div>{student.gender || "-"}</div>
                        <div className="text-slate-400 text-[10px]">{student.dob ? new Date(student.dob).toLocaleDateString() : "-"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[11px]">
                        {student.phone || student.guardian_phone ? (
                          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <Phone className="w-3 h-3 text-slate-400" />{student.phone || student.guardian_phone}
                          </span>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${student.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}`}>
                          {student.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalStudents > 15 && (
          <div className="flex items-center justify-between pt-3 text-xs text-slate-500 dark:text-slate-400">
            <div>Showing {Math.min((studentPage - 1) * 15 + 1, totalStudents)} to {Math.min(studentPage * 15, totalStudents)} of {totalStudents} students</div>
            <div className="flex items-center gap-2">
              <button disabled={studentPage <= 1} onClick={() => setStudentPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-4 h-4" /></button>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Page {studentPage} of {Math.ceil(totalStudents / 15)}</span>
              <button disabled={studentPage >= Math.ceil(totalStudents / 15)} onClick={() => setStudentPage((p) => p + 1)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
