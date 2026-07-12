"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  UserCheck,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Printer,
  Download,
  Calendar,
  Layers,
  FileText,
  Clock,
  XCircle,
  Info,
  Check
} from "lucide-react";
import { useClasses } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useTeacherAssignment, PopulatedTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useStudents } from "@/app/hooks/useStudents";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";
import { PrintService } from "@/app/lib/print-service";

export default function ClassTeacherAssignmentPage() {
  const { user } = useAuth();
  const { academicYear } = useAppState();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";

  const { classes, isLoading: loadingClasses, fetchClasses } = useClasses({ filterByYear: true });
  const { teachers, isLoading: loadingTeachers, fetchTeachers } = useTeachers({ skip: true });
  const { assignments, isLoading: loadingAssignments, fetchAssignments, createAssignment, updateAssignment, deleteAssignment } = useTeacherAssignment();
  const { students, fetchStudents } = useStudents({ skip: true });

  // Filters
  const [filterYear, setFilterYear] = useState(academicYear || "2026");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<PopulatedTeacherAssignment | null>(null);

  // Detail Drawer state
  const [selectedAssignmentDetails, setSelectedAssignmentDetails] = useState<PopulatedTeacherAssignment | null>(null);

  // Form fields
  const [formClassId, setFormClassId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formCoTeacherId, setFormCoTeacherId] = useState("");
  const [formEffectiveDate, setFormEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState("Active");
  const [formRemarks, setFormRemarks] = useState("");
  const [formEditReason, setFormEditReason] = useState("");

  // Form validation / warning states
  const [formError, setFormError] = useState("");
  const [workloadWarning, setWorkloadWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastSuccess, setToastSuccess] = useState("");
  const [toastError, setToastError] = useState("");

  // Active Report Tab State
  const [activeReportTab, setActiveReportTab] = useState<"list" | "workload" | "unassigned">("list");

  // Load initial data
  useEffect(() => {
    fetchTeachers();
    fetchStudents({ limit: 10000 });
  }, [fetchTeachers, fetchStudents]);

  // Load all assignments in the system for workload calculations and lists
  useEffect(() => {
    if (filterYear) {
      fetchAssignments({ academic_year: filterYear, limit: 10000 });
    }
  }, [filterYear, fetchAssignments]);

  const activeTeachers = useMemo(() => {
    return teachers.filter(t => t.is_active !== false);
  }, [teachers]);

  // Compute stats of Class Teacher roles
  const stats = useMemo(() => {
    const totalClasses = classes.length;

    // Class Teacher assignments for selected year
    const activeClassAssignments = assignments.filter(
      a => a.academic_year === filterYear && a.assignment_type === "Class Teacher" && a.status === "Active"
    );

    const assignedClassIds = new Set(activeClassAssignments.map(a => a.class_id?._id).filter(Boolean));
    const assignedClasses = assignedClassIds.size;
    const unassignedClasses = Math.max(0, totalClasses - assignedClasses);

    const totalTeachers = activeTeachers.length;
    const assignedTeachers = new Set(activeClassAssignments.map(a => a.teacher_id?._id).filter(Boolean)).size;

    return {
      totalClasses,
      assignedClasses,
      unassignedClasses,
      totalTeachers,
      assignedTeachers,
      pendingAssignments: unassignedClasses
    };
  }, [classes, assignments, filterYear, activeTeachers]);

  // Workload calculator helper for a teacher
  const computeTeacherWorkload = (teacherId: string) => {
    const teacherAssignments = assignments.filter(
      a => a.teacher_id?._id === teacherId && a.academic_year === filterYear && a.status === "Active"
    );

    const assignedClassesCount = new Set(
      teacherAssignments.map(a => a.class_id?._id).filter(Boolean)
    ).size;

    const assignedSubjectsCount = new Set(
      teacherAssignments.map(a => a.subject_master_id?._id).filter(Boolean)
    ).size;

    const totalWeeklyPeriods = teacherAssignments.reduce(
      (sum, a) => sum + (a.weekly_periods || 0), 0
    );

    return {
      classesCount: assignedClassesCount,
      subjectsCount: assignedSubjectsCount,
      periodsCount: totalWeeklyPeriods,
      isOverloaded: assignedClassesCount >= 5 || totalWeeklyPeriods >= 24
    };
  };

  // Sections list for search dropdowns
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.section) set.add(c.section);
    });
    return Array.from(set).sort();
  }, [classes]);

  // Dynamic filter logic for class teacher assignments list
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      // Must be Class or Co-class teacher assignments
      const isClassType = a.assignment_type === "Class Teacher" || a.assignment_type === "Co-Class Teacher";
      if (!isClassType) return false;

      if (filterClassId && a.class_id?._id !== filterClassId) return false;
      if (filterSection && a.class_id?.section !== filterSection) return false;
      if (filterTeacherId && a.teacher_id?._id !== filterTeacherId) return false;
      if (filterStatus && a.status !== filterStatus) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const tName = a.teacher_id?.name || "";
        const tEmpId = a.teacher_id?.employee_id || "";
        const cName = a.class_id?.name || "";
        const cSection = a.class_id?.section || "";
        const match = tName.toLowerCase().includes(q) ||
          tEmpId.toLowerCase().includes(q) ||
          cName.toLowerCase().includes(q) ||
          cSection.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [assignments, filterClassId, filterSection, filterTeacherId, filterStatus, searchQuery]);

  // Unassigned classes list
  const unassignedClassesList = useMemo(() => {
    const activeClassAssignments = assignments.filter(
      a => a.academic_year === filterYear && a.assignment_type === "Class Teacher" && a.status === "Active"
    );
    const assignedClassIds = new Set(activeClassAssignments.map(a => a.class_id?._id).filter(Boolean));
    return classes.filter(c => !assignedClassIds.has(c._id));
  }, [classes, assignments, filterYear]);

  // Load edit fields
  const handleOpenEdit = (assign: PopulatedTeacherAssignment) => {
    setEditingAssignment(assign);
    setFormClassId(assign.class_id?._id || "");
    setFormTeacherId(assign.teacher_id?._id || "");
    setFormEffectiveDate(assign.effective_date ? assign.effective_date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setFormStatus(assign.status);
    setFormRemarks(assign.remarks || "");
    setFormEditReason("");
    setFormError("");
    setWorkloadWarning(null);
    setIsFormOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setFormClassId("");
    setFormTeacherId("");
    setFormCoTeacherId("");
    setFormEffectiveDate(new Date().toISOString().split("T")[0]);
    setFormStatus("Active");
    setFormRemarks("");
    setFormEditReason("");
    setFormError("");
    setWorkloadWarning(null);
    setIsFormOpen(true);
  };

  // Trigger workload warnings in assignment form dynamically
  useEffect(() => {
    if (!formTeacherId || !isFormOpen) {
      setWorkloadWarning(null);
      return;
    }
    const workload = computeTeacherWorkload(formTeacherId);
    if (workload.isOverloaded) {
      setWorkloadWarning(
        `Warning: Selected teacher is already assigned to ${workload.classesCount} classes and ${workload.periodsCount} periods this week.`
      );
    } else {
      setWorkloadWarning(null);
    }
  }, [formTeacherId, isFormOpen]);

  // Save or Update assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClassId || !formTeacherId) {
      setFormError("Class and Class Teacher selection are mandatory.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    if (editingAssignment) {
      // Update
      if (!formEditReason.trim()) {
        setFormError("An edit audit reason is mandatory when modifying assignments.");
        setIsSubmitting(false);
        return;
      }

      const res = await updateAssignment(editingAssignment._id, {
        academic_year: filterYear,
        class_id: formClassId,
        teacher_id: formTeacherId,
        assignment_type: editingAssignment.assignment_type,
        effective_date: formEffectiveDate,
        status: formStatus,
        remarks: `${formRemarks} (Reason: ${formEditReason})`
      });

      if (res.success) {
        setToastSuccess("Class Teacher assignment updated successfully!");
        setIsFormOpen(false);
        fetchAssignments({ academic_year: filterYear, limit: 10000 });
        setTimeout(() => setToastSuccess(""), 3000);
      } else {
        setFormError(res.message || "Failed to update assignment.");
      }
    } else {
      // Create
      // If Class Teacher role
      const res = await createAssignment({
        academic_year: filterYear,
        class_id: formClassId,
        teacher_id: formTeacherId,
        assignment_type: "Class Teacher",
        effective_date: formEffectiveDate,
        status: formStatus,
        remarks: formRemarks
      });

      if (res.success) {
        // Optional Co-Class Teacher creation
        if (formCoTeacherId) {
          await createAssignment({
            academic_year: filterYear,
            class_id: formClassId,
            teacher_id: formCoTeacherId,
            assignment_type: "Co-Class Teacher",
            effective_date: formEffectiveDate,
            status: formStatus,
            remarks: "Assigned alongside primary Class Teacher."
          });
        }

        setToastSuccess("Class Teacher assignment created successfully!");
        setIsFormOpen(false);
        fetchAssignments({ academic_year: filterYear, limit: 10000 });
        setTimeout(() => setToastSuccess(""), 3000);
      } else {
        setFormError(res.message || "Failed to create assignment.");
      }
    }

    setIsSubmitting(false);
  };

  // Soft delete assignment handler with audit check
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to soft-delete this assignment? It will maintain complete audit history logs.")) return;
    const res = await deleteAssignment(id);
    if (res.success) {
      setToastSuccess("Assignment soft-deleted successfully!");
      fetchAssignments({ academic_year: filterYear, limit: 10000 });
      setTimeout(() => setToastSuccess(""), 3000);
    } else {
      setToastError(res.message || "Failed to delete assignment.");
      setTimeout(() => setToastError(""), 3000);
    }
  };

  // Compute student count of the selected assignment class
  const classStudentsCount = useMemo(() => {
    if (!selectedAssignmentDetails || !selectedAssignmentDetails.class_id) return 0;
    const cId = selectedAssignmentDetails.class_id._id;
    return students.filter(s => {
      const sClassId = typeof s.class_id === "object" ? s.class_id?._id : s.class_id;
      return sClassId === cId;
    }).length;
  }, [selectedAssignmentDetails, students]);

  // Export workload CSV report
  const handleExportWorkloadCSV = () => {
    let csv = "Employee ID,Teacher Name,Assigned Classes Count,Subjects Count,Weekly Periods,Status\n";
    activeTeachers.forEach(t => {
      const w = computeTeacherWorkload(t._id);
      csv += `"${t.employee_id || "N/A"}","${t.name}",${w.classesCount},${w.subjectsCount},${w.periodsCount},"${w.isOverloaded ? "OVERLOADED" : "Normal"}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `staff_workload_audit_${filterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3 dark:text-slate-400">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Denied</h2>
        <p className="text-sm">You do not have permission to view Class Teacher Assignments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">Class Teacher Assignment Portal</h1>
          <p className="page-desc mt-1">Configure class teachers and co-teachers. Manage teacher assignments, audit logs, and workloads.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Assignment
        </button>
      </div>

      {/* Dynamic Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stats.totalClasses}</h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Total Classes</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xl font-bold text-emerald-650 dark:text-emerald-450 leading-none">{stats.assignedClasses}</h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Assigned Classes</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xl font-bold text-rose-650 dark:text-rose-450 leading-none">{stats.unassignedClasses}</h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Unassigned</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stats.totalTeachers}</h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Total Teachers</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xl font-bold text-indigo-650 dark:text-indigo-400 leading-none">{stats.assignedTeachers}</h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Active Staff Assigned</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
          <h3 className="text-xl font-bold text-amber-650 dark:text-amber-450 leading-none">{stats.pendingAssignments}</h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">Pending Mapping</p>
        </div>
      </div>

      {/* Central Search and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 flex flex-col gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Academic Year Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Academic Session</label>
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-md outline-none cursor-pointer appearance-none"
              >
                <option value="2026">Session 2026</option>
                <option value="2027">Session 2027</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Class Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Class</label>
            <div className="relative">
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-md outline-none cursor-pointer appearance-none"
              >
                <option value="">All Classes</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Section Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Section</label>
            <div className="relative">
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-md outline-none cursor-pointer appearance-none"
              >
                <option value="">All Sections</option>
                {uniqueSections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Teacher Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Teacher</label>
            <div className="relative">
              <select
                value={filterTeacherId}
                onChange={(e) => setFilterTeacherId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-md outline-none cursor-pointer appearance-none"
              >
                <option value="">All Teachers</option>
                {activeTeachers.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-455 mb-1">Status</label>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-955 border border-border text-slate-850 dark:text-slate-200 text-xs font-bold rounded-md outline-none cursor-pointer appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-455 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Search Input */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Global Query Search
            </label>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search teacher, employee ID, class, section, session..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
        h-8
        w-full
        rounded-md
        border
        border-slate-300
        bg-slate-50
        pl-10
        pr-3
        text-sm
        font-medium
        text-slate-800
        outline-none
        placeholder:text-slate-400
        focus:border-blue-500
        focus:ring-2
        focus:ring-blue-100
        dark:border-slate-700
        dark:bg-slate-900
        dark:text-slate-200
      "
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex border-b border-border text-xs font-bold">
        <button
          onClick={() => setActiveReportTab("list")}
          className={`px-4 py-3 border-b-2 transition-all ${activeReportTab === "list"
            ? "border-primary text-primary"
            : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
        >
          Class Teacher Assignments ({filteredAssignments.length})
        </button>
        <button
          onClick={() => setActiveReportTab("workload")}
          className={`px-4 py-3 border-b-2 transition-all ${activeReportTab === "workload"
            ? "border-primary text-primary"
            : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
        >
          Teacher Workload Audit Report
        </button>
        <button
          onClick={() => setActiveReportTab("unassigned")}
          className={`px-4 py-3 border-b-2 transition-all ${activeReportTab === "unassigned"
            ? "border-primary text-primary"
            : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
        >
          Unassigned Classes Mapping ({unassignedClassesList.length})
        </button>
      </div>

      {/* Report views */}
      {activeReportTab === "list" && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden" id="printable-area">
          {loadingAssignments || loadingClasses ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-bold">Loading assignment logs...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Users className="w-12 h-12 opacity-20" />
              <p className="text-xs font-bold">No Class Teacher assignments found matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table text-[13px] whitespace-nowrap w-full">
                <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
                  <tr>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Assigned Class</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Type</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Teacher Profile</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Session</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Effective Date</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Author Info</th>
                    <th className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssignments.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {a.class_id?.name || "Class"}
                        </div>
                        {a.class_id?.section && (
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">Section: {a.class_id.section}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${a.assignment_type === "Class Teacher"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}>
                          {a.assignment_type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 overflow-hidden border border-border">
                            {a.teacher_id?.photo_url ? (
                              <img src={a.teacher_id.photo_url} alt={a.teacher_id.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{a.teacher_id?.name?.charAt(0) || "T"}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-850 dark:text-white">{a.teacher_id?.name || "Teacher"}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {a.teacher_id?.employee_id || "N/A"} • {a.teacher_id?.designation || "Teacher"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-sans font-bold text-slate-500">{a.academic_year}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {a.effective_date ? new Date(a.effective_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${a.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-border"
                          }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-700 dark:text-slate-350">{a.created_by?.name || "Admin"}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedAssignmentDetails(a)}
                            className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="View assignment details card"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(a)}
                            className="p-1 text-slate-450 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit assignment record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(a._id)}
                            className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-colors cursor-pointer"
                            title="Soft delete assignment (soft audit)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Teacher Workload Audit Report View */}
      {activeReportTab === "workload" && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-slate-50 dark:bg-slate-950/20 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Staff Workload Audits</h4>
            <button
              onClick={handleExportWorkloadCSV}
              className="px-3 py-1.5 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Export Workload Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="erp-table text-[13px] whitespace-nowrap w-full">
              <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
                <tr>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Emp ID</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Teacher Name</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Department</th>
                  <th className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Assigned Classes</th>
                  <th className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Assigned Subjects</th>
                  <th className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Weekly Periods</th>
                  <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Workload Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold">
                {activeTeachers.map(t => {
                  const workload = computeTeacherWorkload(t._id);
                  return (
                    <tr key={t._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-4 font-sans text-slate-500 font-bold">{t.employee_id || "-"}</td>
                      <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">{t.name}</td>
                      <td className="px-4 py-4 text-slate-455">{t.department || "Academic"}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-800 dark:text-slate-200">{workload.classesCount}</td>
                      <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-350">{workload.subjectsCount}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-800 dark:text-slate-200">{workload.periodsCount}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold border ${workload.isOverloaded
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                          {workload.isOverloaded ? "OVERLOADED" : "Normal Load"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unassigned Classes List View */}
      {activeReportTab === "unassigned" && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-slate-50 dark:bg-slate-950/20 text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Unassigned Classes Catalog</h4>
          </div>

          {unassignedClassesList.length === 0 ? (
            <div className="p-8 text-center text-slate-450 font-bold">
              All active classes have been mapped with a Class Teacher!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table text-[13px] whitespace-nowrap w-full">
                <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
                  <tr>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class Code</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class Name</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Section</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Capacity</th>
                    <th className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Academic Year</th>
                    <th className="px-4 py-4 text-center font-bold text-slate-700 dark:text-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unassignedClassesList.map(c => (
                    <tr key={c._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-4 font-sans font-bold text-slate-500">{c.class_code || "—"}</td>
                      <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="px-4 py-4 font-semibold text-slate-655">{c.section || "—"}</td>
                      <td className="px-4 py-4 font-sans">{c.capacity} Students</td>
                      <td className="px-4 py-4">{c.academic_year}</td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => {
                            setFormClassId(c._id);
                            setFormTeacherId("");
                            setFormCoTeacherId("");
                            setFormEffectiveDate(new Date().toISOString().split("T")[0]);
                            setFormStatus("Active");
                            setFormRemarks("");
                            setFormError("");
                            setWorkloadWarning(null);
                            setEditingAssignment(null);
                            setIsFormOpen(true);
                          }}
                          className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-[11px] hover:bg-primary/90 transition-all cursor-pointer"
                        >
                          Assign Class Teacher
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT ASSIGNMENT MODAL ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col z-50 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAssignment ? `Edit Assignment for ${editingAssignment.class_id?.name || "Class"}` : "Create Class Teacher Assignment"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-slate-450" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {workloadWarning && (
                <div className="bg-amber-50 border border-amber-250 text-amber-800 text-xs font-bold p-3.5 rounded-xl flex items-start gap-2">
                  <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{workloadWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Academic Year */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Academic Year *</label>
                  <input
                    type="text"
                    value={filterYear}
                    disabled
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-semibold outline-none bg-slate-50 dark:bg-slate-800 opacity-60"
                  />
                </div>

                {/* Class & Section Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class & Section *</label>
                  <div className="relative">
                    <select
                      value={formClassId}
                      onChange={(e) => setFormClassId(e.target.value)}
                      disabled={!!editingAssignment}
                      className="w-full pl-3 pr-8 py-2 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary appearance-none bg-white dark:bg-slate-900 disabled:opacity-50 cursor-pointer text-slate-800 dark:text-slate-200"
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c._id} value={c._id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Class Teacher Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Class Teacher *</label>
                <div className="relative">
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary appearance-none bg-white dark:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Select Teacher</option>
                    {activeTeachers.map(t => {
                      const w = computeTeacherWorkload(t._id);
                      return (
                        <option key={t._id} value={t._id}>
                          {t.name} {t.employee_id ? `(${t.employee_id})` : ""} - Current load: {w.classesCount} class(es)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Optional Co-Class Teacher Selector (Only on Creation) */}
              {!editingAssignment && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Co-Class Teacher (Optional)</label>
                  <div className="relative">
                    <select
                      value={formCoTeacherId}
                      onChange={(e) => setFormCoTeacherId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary appearance-none bg-white dark:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-200"
                    >
                      <option value="">Select Co-Class Teacher (None)</option>
                      {activeTeachers.filter(t => t._id !== formTeacherId).map(t => (
                        <option key={t._id} value={t._id}>
                          {t.name} {t.employee_id ? `(${t.employee_id})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Effective Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Effective Date</label>
                  <input
                    type="date"
                    value={formEffectiveDate}
                    onChange={(e) => setFormEffectiveDate(e.target.value)}
                    className="w-full px-3 py-1.8 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assignment Status</label>
                  <div className="relative">
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary appearance-none bg-white dark:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-200"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Special Notes</label>
                <textarea
                  placeholder="Describe special role details..."
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Audit Edit Reason field (Mandatory for Updates) */}
              {editingAssignment && (
                <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-border">
                  <label className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Audit Edit Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corrected selection error / deactivation reason"
                    value={formEditReason}
                    onChange={(e) => setFormEditReason(e.target.value)}
                    className="w-full px-3 py-1.8 border border-border rounded-lg text-xs font-semibold outline-none focus:border-primary bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 bg-white cursor-pointer text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DETAIL VIEW DRAWER ── */}
      {selectedAssignmentDetails && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedAssignmentDetails(null)} />
          <div className="bg-white dark:bg-slate-900 border-l border-border w-full max-w-md h-full z-50 flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-250 text-left">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <span>Assignment Profile Card</span>
              </h3>
              <button
                onClick={() => setSelectedAssignmentDetails(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-slate-450" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Teacher Info */}
              <div className="flex items-center gap-4 border-b border-border pb-5">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0 border border-border">
                  {selectedAssignmentDetails.teacher_id?.photo_url ? (
                    <img src={selectedAssignmentDetails.teacher_id.photo_url} alt={selectedAssignmentDetails.teacher_id.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">{selectedAssignmentDetails.teacher_id?.name?.charAt(0) || "T"}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-[15px] font-black text-slate-850 dark:text-white">{selectedAssignmentDetails.teacher_id?.name}</h4>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">Emp ID: {selectedAssignmentDetails.teacher_id?.employee_id || "N/A"}</p>
                  <p className="text-[11px] font-extrabold text-slate-400 mt-1 uppercase tracking-wide">
                    {selectedAssignmentDetails.teacher_id?.designation || "Faculty Member"}
                  </p>
                </div>
              </div>

              {/* Assignment details card */}
              <div className="space-y-4">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-455">Assignment Mapping</h5>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-lg border border-border/80">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">Class Section</span>
                    <span className="font-extrabold text-slate-850 dark:text-white">
                      {selectedAssignmentDetails.class_id?.name || "Class"}
                    </span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-lg border border-border/80">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">Students Count</span>
                    <span className="font-extrabold text-slate-850 dark:text-white">{classStudentsCount} Students</span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-lg border border-border/80">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">Effective Date</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedAssignmentDetails.effective_date ? new Date(selectedAssignmentDetails.effective_date).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-lg border border-border/80">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">Session Year</span>
                    <span className="font-sans text-slate-800 dark:text-slate-200">{selectedAssignmentDetails.academic_year}</span>
                  </div>
                </div>
              </div>

              {/* Workload Profile Summary */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-455">Workload Summary Portfolio</h5>
                {(() => {
                  const workload = computeTeacherWorkload(selectedAssignmentDetails.teacher_id?._id);
                  return (
                    <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4 border border-border rounded-xl space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500">Assigned Classes Count:</span>
                        <span className="font-extrabold text-slate-850 dark:text-white">{workload.classesCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500">Subject Portfolios:</span>
                        <span className="font-extrabold text-slate-850 dark:text-white">{workload.subjectsCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500">Weekly Scheduled Periods:</span>
                        <span className="font-extrabold text-slate-850 dark:text-white">{workload.periodsCount}</span>
                      </div>
                      <div className="h-px bg-border my-2" />
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-500">Workload Audit Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold border ${workload.isOverloaded
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>
                          {workload.isOverloaded ? "OVERLOADED" : "Normal Load"}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Remarks */}
              {selectedAssignmentDetails.remarks && (
                <div className="space-y-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-455">Assignment Remarks</h5>
                  <div className="bg-slate-50/50 dark:bg-slate-800/40 p-4 border border-border rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350 italic">
                    "{selectedAssignmentDetails.remarks}"
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-950/20 flex justify-end">
              <button
                onClick={() => setSelectedAssignmentDetails(null)}
                className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-100 bg-white cursor-pointer text-slate-700"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toastSuccess && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold">{toastSuccess}</span>
          </div>
        )}
        {toastError && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-600 text-white shadow-lg animate-in slide-in-from-bottom-5 duration-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold">{toastError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
