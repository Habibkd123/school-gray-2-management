"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, RefreshCw, Trash2, Loader2, AlertCircle,
  ChevronDown, Filter, BookOpen, GraduationCap, Edit,
  MoreVertical, Eye, Copy, Download, FileText, Check, X,
  User, ShieldAlert, Grid, List, UploadCloud, LayoutGrid
} from "lucide-react";
import Link from "next/link";
import { Modal } from "@/app/components/ui/modal";
import { useTeacherAssignment, PopulatedTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useSubjectAssignment } from "@/app/hooks/useSubjectAssignment";
import { useSubjectMaster } from "@/app/hooks/useSubjectMaster";
import { useClasses } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAppState } from "@/app/context/store";
import { useAuth } from "@/app/context/auth";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { PaginationBar } from "@/app/components/ui/pagination-bar";
import { useAuthReady } from "@/lib/utils/session";

const ACADEMIC_YEARS = ["2025-2026", "2026-2027", "2027-2028"];
const ASSIGNMENT_TYPES = ["Subject Teacher", "Class Teacher", "Co-Class Teacher", "Temporary Teacher", "Substitute Teacher"];
const PAGE_SIZE = 30;

export default function TeacherAssignmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { academicYear } = useAppState();

  const {
    assignments,
    total,
    isLoading,
    error,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment
  } = useTeacherAssignment();

  // Load classes, subject assignments, and teachers globally using proper hooks
  const { classes } = useClasses({ filterByYear: false });
  const { assignments: subjectAssignments, fetchAssignments: fetchSubjectAssignments } = useSubjectAssignment();
  const { teachers } = useTeachers({ limit: "all" });
  const { subjects: subjectList } = useSubjectMaster({ limit: 1000 });

  // Filtering & Sorting State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterYear, setFilterYear] = useState(academicYear);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSort, setSelectedSort] = useState("CreatedDateDesc");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const [collapsedListGroups, setCollapsedListGroups] = useState<Set<string>>(new Set());
  const toggleListGroup = (groupId: string) => {
    setCollapsedListGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) newSet.delete(groupId);
      else newSet.add(groupId);
      return newSet;
    });
  };

  // Popover States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isWorkloadWarningOpen, setIsWorkloadWarningOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  const [selectedAssignment, setSelectedAssignment] = useState<PopulatedTeacherAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Add Form State
  const [formYear, setFormYear] = useState(academicYear);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [teacherSearchText, setTeacherSearchText] = useState("");
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [formClassName, setFormClassName] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formType, setFormType] = useState("Subject Teacher");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [formEffectiveDate, setFormEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [formRemarks, setFormRemarks] = useState("");

  // Edit Form State
  const [editYear, setEditYear] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editType, setEditType] = useState("Subject Teacher");
  const [editEffectiveDate, setEditEffectiveDate] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [editRemarks, setEditRemarks] = useState("");
  const [editTeacherSearchText, setEditTeacherSearchText] = useState("");
  const [isEditTeacherDropdownOpen, setIsEditTeacherDropdownOpen] = useState(false);

  // Debounce search input to limit API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Load static lists
  const authReady = useAuthReady();
  useEffect(() => {
    if (!authReady) return;
    fetchSubjectAssignments({ limit: 1000, status: "Active" });
  }, [fetchSubjectAssignments, authReady]);

  const doFetch = useCallback(() => {
    fetchAssignments({
      search: debouncedSearch,
      class_id: filterClassId || undefined,
      subject_id: filterSubjectId || undefined,
      teacher_id: filterTeacherId || undefined,
      assignment_type: filterType || undefined,
      status: statusFilter,
      sort: selectedSort,
      academic_year: filterYear || undefined,
      page: 1,
      limit: 5000
    });
  }, [fetchAssignments, debouncedSearch, filterClassId, filterSubjectId, filterTeacherId, filterType, statusFilter, selectedSort, filterYear]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Unique Class Names for Dropdowns
  const uniqueClassNames = useMemo(() => {
    const names = new Set(classes.map(c => c.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [classes]);

  // Dynamic Sections matching selected class name
  const availableSections = useMemo(() => {
    if (!formClassName) return [];
    return classes
      .filter(c => c.name === formClassName)
      .map(c => c.section || "No Section")
      .filter((val, idx, self) => self.indexOf(val) === idx);
  }, [classes, formClassName]);

  // Resolve Class ID from Selection
  const resolvedClass = useMemo(() => {
    if (!formClassName) return null;
    const targetSection = formSection === "No Section" ? "" : formSection;
    return classes.find(c => c.name === formClassName && (c.section || "") === targetSection);
  }, [classes, formClassName, formSection]);

  // Group assignments by class for Grid View
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, { class: any, assignments: PopulatedTeacherAssignment[] }> = {};
    assignments.forEach(a => {
      if (!a.class_id) return;
      const key = `${a.class_id.name} ${a.class_id.section || ""}`.trim();
      if (!groups[key]) {
        groups[key] = { class: a.class_id, assignments: [] };
      }
      groups[key].assignments.push(a);
    });
    // Sort groups naturally by class name and then section
    return Object.values(groups).sort((a, b) => {
      const nameA = a.class.name || "";
      const nameB = b.class.name || "";
      
      const nameComparison = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      if (nameComparison !== 0) return nameComparison;
      
      const secA = a.class.section || "";
      const secB = b.class.section || "";
      return secA.localeCompare(secB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [assignments]);

  const totalGroups = groupedAssignments.length;
  const paginatedGroups = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return groupedAssignments.slice(startIndex, startIndex + PAGE_SIZE);
  }, [groupedAssignments, page]);

  // Available subjects assigned to the resolved class
  const availableSubjectsForClass = useMemo(() => {
    if (!resolvedClass) return [];
    const classIdStr = resolvedClass._id.toString();

    // Filter subject assignments matching selected class and year
    const assigned = subjectAssignments.filter(a => {
      const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      return aClassId === classIdStr && a.academic_year === formYear && a.status === "Active";
    });

    return assigned.map(a => a.subject_master_id).filter(Boolean);
  }, [resolvedClass, subjectAssignments, formYear]);

  // Search/Filter Faculty Dropdown
  const filteredTeachers = useMemo(() => {
    if (!teacherSearchText) return teachers;
    const q = teacherSearchText.toLowerCase();
    return teachers.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.employee_id && t.employee_id.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  }, [teachers, teacherSearchText]);

  const selectedTeacherDetails = useMemo(() => {
    return teachers.find(t => t._id === formTeacherId);
  }, [teachers, formTeacherId]);

  const filteredEditTeachers = useMemo(() => {
    if (!editTeacherSearchText) return teachers;
    const q = editTeacherSearchText.toLowerCase();
    return teachers.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.employee_id && t.employee_id.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q))
    );
  }, [teachers, editTeacherSearchText]);

  const selectedEditTeacherDetails = useMemo(() => {
    return teachers.find(t => t._id === editTeacherId);
  }, [teachers, editTeacherId]);

  const editTeacherWorkload = useMemo(() => {
    if (!editTeacherId) return 0;
    return subjectAssignments
      .filter(a => {
        const tId = typeof a.teacher_id === "object" ? a.teacher_id?._id : a.teacher_id;
        return tId === editTeacherId && a.academic_year === editYear && a.status === "Active" && a._id !== selectedAssignment?._id;
      })
      .reduce((sum, a) => sum + (a.weekly_periods || 0), 0);
  }, [subjectAssignments, editTeacherId, editYear, selectedAssignment]);

  // Calculate selected teacher workload
  const teacherWorkload = useMemo(() => {
    if (!formTeacherId) return 0;
    // Sum matching active subject assignments of this teacher
    return subjectAssignments
      .filter(a => {
        const tId = typeof a.teacher_id === "object" ? a.teacher_id?._id : a.teacher_id;
        return tId === formTeacherId && a.academic_year === formYear && a.status === "Active";
      })
      .reduce((sum, a) => sum + (a.weekly_periods || 0), 0);
  }, [subjectAssignments, formTeacherId, formYear]);

  // Calculate additional workload being added in the form
  const addedWorkload = useMemo(() => {
    if (!resolvedClass || selectedSubjectIds.length === 0) return 0;
    const classIdStr = resolvedClass._id.toString();
    return subjectAssignments
      .filter(a => {
        const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
        const subId = typeof a.subject_master_id === "object" ? a.subject_master_id?._id : a.subject_master_id;
        return aClassId === classIdStr &&
          a.academic_year === formYear &&
          selectedSubjectIds.includes(subId) &&
          a.status === "Active";
      })
      .reduce((sum, a) => sum + (a.weekly_periods || 0), 0);
  }, [resolvedClass, selectedSubjectIds, subjectAssignments, formYear]);

  const resetForm = () => {
    setFormYear(academicYear);
    setFormTeacherId("");
    setTeacherSearchText("");
    setFormClassName("");
    setFormSection("");
    setFormType("Subject Teacher");
    setSelectedSubjectIds([]);
    setFormEffectiveDate(new Date().toISOString().split("T")[0]);
    setFormStatus("Active");
    setFormRemarks("");
    setFormError("");
  };

  const executeAddAssignment = async (data: any) => {
    setSubmitting(true);
    setFormError("");

    const res = await createAssignment(data);
    setSubmitting(false);

    if (res.success) {
      setIsAddOpen(false);
      setIsWorkloadWarningOpen(false);
      resetForm();
      doFetch();
    } else {
      setFormError(res.message || "Failed to assign teacher");
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYear || !formTeacherId || !formClassName || !formSection || selectedSubjectIds.length === 0) {
      setFormError("All required fields (*) must be filled.");
      return;
    }

    if (!resolvedClass) {
      setFormError("Selected class/section combination is invalid.");
      return;
    }

    const payload = {
      academic_year: formYear,
      teacher_id: formTeacherId,
      class_id: resolvedClass._id,
      subject_master_ids: selectedSubjectIds,
      assignment_type: formType,
      effective_date: formEffectiveDate,
      status: formStatus,
      remarks: formRemarks
    };

    // Workload check: show warning modal if > 40 periods/week
    const totalFutureWorkload = teacherWorkload + addedWorkload;
    if (totalFutureWorkload > 40) {
      setPendingSubmitData(payload);
      setIsWorkloadWarningOpen(true);
    } else {
      executeAddAssignment(payload);
    }
  };

  const executeEditAssignment = async (id: string, payload: any) => {
    setSubmitting(true);
    setFormError("");
    const res = await updateAssignment(id, payload);
    setSubmitting(false);
    if (res.success) {
      setIsEditOpen(false);
      setIsWorkloadWarningOpen(false);
      setSelectedAssignment(null);
      doFetch();
    } else {
      setFormError(res.message || "Failed to update assignment");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    if (!editYear || !editTeacherId || !editClassId || !editSubjectId) {
      setFormError("All required fields (*) must be filled.");
      return;
    }

    const payload = {
      academic_year: editYear,
      teacher_id: editTeacherId,
      class_id: editClassId,
      subject_master_id: editSubjectId,
      assignment_type: editType,
      effective_date: editEffectiveDate,
      status: editStatus,
      remarks: editRemarks
    };

    const assignedPeriod = subjectAssignments.find(a => a.subject_master_id?._id === editSubjectId && (typeof a.class_id === "object" ? a.class_id?._id : a.class_id) === editClassId && a.academic_year === editYear)?.weekly_periods || 0;
    const finalFutureWorkload = editTeacherWorkload + (editStatus === "Active" ? assignedPeriod : 0);

    if (finalFutureWorkload > 40) {
      setPendingSubmitData({
        isEdit: true,
        id: selectedAssignment._id,
        payload
      });
      setIsWorkloadWarningOpen(true);
    } else {
      executeEditAssignment(selectedAssignment._id, payload);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);
    const res = await deleteAssignment(selectedAssignment._id);
    setSubmitting(false);
    if (res.success) {
      setIsDeleteOpen(false);
      setSelectedAssignment(null);
      doFetch();
    } else {
      alert(res.message || "Failed to remove assignment");
    }
  };

  const startEdit = (item: PopulatedTeacherAssignment) => {
    setSelectedAssignment(item);
    setEditYear(item.academic_year);
    setEditTeacherId(item.teacher_id?._id || "");
    setEditClassId(item.class_id?._id || "");
    setEditSubjectId(item.subject_master_id?._id || "");
    setEditType(item.assignment_type || "Subject Teacher");
    setEditEffectiveDate(item.effective_date ? item.effective_date.split("T")[0] : "");
    setEditStatus(item.status || "Active");
    setEditRemarks(item.remarks || "");
    setFormError("");
    setIsEditOpen(true);
  };

  const handleExport = () => {
    if (assignments.length === 0) {
      alert("No faculty assignments available to export.");
      return;
    }

    const headers = ["Teacher Name", "Employee ID", "Assigned Class", "Section", "Subject Name", "Type", "Academic Year", "Status"];
    const rows = assignments.map(a => [
      a.teacher_id?.name || "",
      a.teacher_id?.employee_id || "",
      a.class_id?.name || "",
      a.class_id?.section || "",
      a.subject_master_id?.name || "",
      a.assignment_type || "Subject Teacher",
      a.academic_year,
      a.status || "Active"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teacher_assignments_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportOpen(false);
  };

  const totalPages = Math.ceil(totalGroups / PAGE_SIZE);

  const columns: ColumnDef<PopulatedTeacherAssignment>[] = [
    {
      header: "Teacher",
      accessorKey: "teacher_id" as any,
      render: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.teacher_id?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.teacher_id?.name || "User")}&background=d68600&color=fff&bold=true`}
            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-800"
            alt={item.teacher_id?.name}
          />
          <div>
            <span className="font-medium text-slate-900 dark:text-white block group-hover:text-primary transition-colors">
              {item.teacher_id?.name || "—"}
            </span>
            <span className="text-[11px] text-slate-500 block font-normal">
              {item.teacher_id?.designation || "Faculty"}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Employee ID",
      accessorKey: "teacher_id" as any,
      render: (item) => <span className="font-sans text-xs font-medium">{item.teacher_id?.employee_id || "—"}</span>
    },
    {
      header: "Assigned Class",
      accessorKey: "class_id" as any,
      render: (item) => <span className="font-medium text-slate-800 dark:text-slate-200">{item.class_id?.name || "—"}</span>
    },
    {
      header: "Section",
      accessorKey: "class_id" as any,
      render: (item) => <span className="font-medium text-slate-800 dark:text-slate-200">{item.class_id?.section || "—"}</span>
    },
    {
      header: "Subject",
      accessorKey: "subject_master_id" as any,
      render: (item) => (
        <span className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
          {item.subject_master_id?.name}
          {item.subject_master_id?.subject_code && (
            <span className="font-sans text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
              {item.subject_master_id.subject_code}
            </span>
          )}
        </span>
      )
    },
    {
      header: "Assignment Type",
      accessorKey: "assignment_type",
      render: (item) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${item.assignment_type === "Class Teacher" ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
          item.assignment_type === "Subject Teacher" ? "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400" :
            "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
          }`}>
          {item.assignment_type || "Subject Teacher"}
        </span>
      )
    },
    {
      header: "Academic Year",
      accessorKey: "academic_year",
      render: (item) => <span className="font-sans text-xs text-slate-500 dark:text-slate-400">{item.academic_year}</span>
    },
    {
      header: "Status",
      accessorKey: "status",
      render: (item) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium ${item.status === "Active" ? "bg-success/10 text-success" : "bg-[#FFEBEB] text-[#E02424]"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${item.status === "Active" ? "bg-success" : "bg-[#E02424]"}`} />
          {item.status || "Active"}
        </span>
      )
    },
    {
      header: "Created By",
      accessorKey: "created_by" as any,
      render: (item) => <span className="text-slate-500 dark:text-slate-450">{item.created_by?.name || "Administrator"}</span>
    },
    {
      header: "Created Date",
      accessorKey: "createdAt" as any,
      render: (item) => (
        item.createdAt ? (
          <span className="text-slate-500 dark:text-slate-450 font-medium">
            {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        ) : "—"
      )
    },
    {
      header: "Action",
      sortable: false,
      className: "text-center relative",
      render: (item) => (
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center">
            <button
              onClick={() => setActionMenuId(actionMenuId === item._id ? null : item._id)}
              className={`p-1.5 rounded-lg transition-colors ${actionMenuId === item._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          {actionMenuId === item._id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
              <div className="absolute right-12 top-0 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                <button
                  onClick={() => {
                    router.push(`/academic-mgmt/teacher-assignment/details?teacherId=${item.teacher_id?._id}&year=${item.academic_year}`);
                    setActionMenuId(null);
                  }}
                  className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-550" /> View details
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        startEdit(item);
                        setActionMenuId(null);
                      }}
                      className="w-full px-4 py-2.5 text-[14px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-550" /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAssignment(item);
                        setIsDeleteOpen(true);
                        setActionMenuId(null);
                      }}
                      className="w-full px-4 py-2.5 text-[14px] text-rose-605 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-450" /> Remove
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 -m-6 p-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="page-title text-xl font-bold text-slate-900 dark:text-white">Teacher Assignment</h1>
          <div className="flex items-center gap-2 text-[14px] leading-[21px] text-[#68718a] mt-1 font-normal">
            <span>Dashboard</span>
            <span>/</span>
            <span>Academic Management</span>
            <span>/</span>
            <span className="text-foreground dark:text-slate-100">Teacher Assignment</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={doFetch} className="p-2 border border-border bg-white dark:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-3 py-2 border border-border bg-white dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-300 text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button onClick={handleExport} className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors">
                    <FileText className="w-4 h-4 text-slate-500" /> Export as CSV
                  </button>
                </div>
              </>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-primary hover:bg-[var(--primary-hover)] rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Faculty</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Listing Panel */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-lg card-shadow text-left p-5">
        {/* Filters Top Row */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-5">
          <h2 className="text-[16px] font-semibold text-foreground dark:text-slate-100">Faculty Assignments</h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* List/Grid layout toggle */}
            <div className="flex items-center bg-[#F8FAFC] dark:bg-slate-900 border border-border rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 transition-colors ${viewMode === "grid" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                <Grid className="w-3.5 h-3.5" /> Grouped
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                <List className="w-3.5 h-3.5" /> Records
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer"
              >
                <Filter className="w-4 h-4 text-slate-400" />
                Filter <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-2xl z-50 text-left p-4 space-y-4">
                    <div className="border-b border-border pb-2">
                      <h3 className="text-[14px] font-bold text-foreground dark:text-slate-100">Filter Assignments</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Class</label>
                        <select
                          value={filterClassId}
                          onChange={(e) => { setFilterClassId(e.target.value); setPage(1); }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 outline-none"
                        >
                          <option value="">All Classes</option>
                          {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Subject</label>
                        <select
                          value={filterSubjectId}
                          onChange={(e) => { setFilterSubjectId(e.target.value); setPage(1); }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 outline-none"
                        >
                          <option value="">All Subjects</option>
                          {subjectList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Teacher</label>
                        <select
                          value={filterTeacherId}
                          onChange={(e) => { setFilterTeacherId(e.target.value); setPage(1); }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 outline-none"
                        >
                          <option value="">All Faculty</option>
                          {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Assignment Type</label>
                        <select
                          value={filterType}
                          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 outline-none"
                        >
                          <option value="">All Types</option>
                          {ASSIGNMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 outline-none"
                        >
                          <option value="all">All Statuses</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Academic Year</label>
                        <select
                          value={filterYear}
                          onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 outline-none font-sans"
                        >
                          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setFilterClassId("");
                          setFilterSubjectId("");
                          setFilterTeacherId("");
                          setFilterType("");
                          setStatusFilter("all");
                          setFilterYear(academicYear);
                          setPage(1);
                          setIsFilterOpen(false);
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sort Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[13px] text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-white dark:bg-slate-900 shadow-sm cursor-pointer"
              >
                Sort: {selectedSort.replace("Asc", " (A-Z)").replace("Desc", " (Z-A)")} <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1 text-left">
                    {[
                      { label: "Teacher Name (A-Z)", val: "TeacherAsc" },
                      { label: "Teacher Name (Z-A)", val: "TeacherDesc" },
                      { label: "Class Weight (Low-High)", val: "ClassAsc" },
                      { label: "Class Weight (High-Low)", val: "ClassDesc" },
                      { label: "Subject Name (A-Z)", val: "SubjectAsc" },
                      { label: "Subject Name (Z-A)", val: "SubjectDesc" },
                      { label: "Assignment Type", val: "TypeAsc" },
                      { label: "Recently Assigned", val: "CreatedDateDesc" },
                      { label: "Oldest Assigned", val: "CreatedDateAsc" },
                      { label: "Status (Active First)", val: "StatusAsc" },
                      { label: "Status (Inactive First)", val: "StatusDesc" }
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => { setSelectedSort(item.val); setPage(1); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-[13px] text-left transition-colors font-semibold cursor-pointer ${item.val === selectedSort ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Count & Global Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-border pb-5">
          <div className="card-subtitle text-[13px]">
            Showing{" "}
            <span className="font-bold text-slate-700 dark:text-slate-250">
              {totalGroups > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalGroups)}` : "0"}
            </span>{" "}of{" "}
            <span className="font-bold text-slate-700 dark:text-slate-250">
              {totalGroups}
            </span>{" "}classes
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Name/ID/Subject/Class/Section"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] text-slate-700 dark:text-slate-205 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Loading / Error / Data State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-slate-500 text-sm">Loading assignments...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Failed to Load Assignments</h3>
            <p className="text-slate-500 text-sm max-w-md">{error}</p>
            <button onClick={doFetch} className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold cursor-pointer">
              Retry
            </button>
          </div>
        ) : (
          <>
            {viewMode === "list" ? (
              <div className="erp-table-container">
                {paginatedGroups.length === 0 ? (
                  <div className="py-20 text-center text-slate-500">
                    No assignments matching criteria.
                  </div>
                ) : (
                  <table className="erp-table w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-border">
                        <th className="py-3 px-4 w-8"></th>
                        <th className="py-3 px-4">Teacher</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedGroups.map((group, idx) => {
                        const groupId = group.class._id;
                        const isCollapsed = collapsedListGroups.has(groupId);
                        const uniqueTeachers = new Set(group.assignments.map(a => a.teacher_id?._id).filter(Boolean)).size;

                        return (
                          <React.Fragment key={groupId}>
                            {/* Group Header Row */}
                            <tr 
                              onClick={() => toggleListGroup(groupId)}
                              className="bg-[#F8FAFC] dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-border group"
                            >
                              <td className="py-3 px-4"></td>
                              <td colSpan={4} className="py-3 px-4">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-primary" />
                                    <span className="font-bold text-[14px] text-slate-800 dark:text-slate-100">
                                      {group.class.name} {group.class.section ? `- ${group.class.section}` : ""}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[12px] font-medium text-slate-500">
                                    <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                                      {group.assignments.length} Assignments
                                    </span>
                                    <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                                      {uniqueTeachers} Teachers
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center text-slate-400 group-hover:text-primary transition-colors">
                                <div className="flex justify-center">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                                </div>
                              </td>
                            </tr>
                            
                            {/* Group Items Rows */}
                            {!isCollapsed && group.assignments.map(assignment => (
                              <tr key={assignment._id} className="erp-table-row border-b border-slate-100 dark:border-slate-800/50">
                                <td className="py-3 px-4"></td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <img src={assignment.teacher_id?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignment.teacher_id?.name || "T")}&background=d68600&color=fff&bold=true`} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-200 object-cover border border-slate-200 dark:border-slate-700" />
                                    <div>
                                      <span className="font-bold text-[13px] text-primary block">
                                        {assignment.teacher_id?.name || "Unknown"}
                                      </span>
                                      {assignment.teacher_id?.employee_id && (
                                        <span className="text-[10px] text-slate-400 mt-0.5 inline-block bg-slate-100 dark:bg-slate-800 px-1.5 rounded">ID: {assignment.teacher_id.employee_id}</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-medium text-[13px] text-slate-700 dark:text-slate-200">
                                    {assignment.subject_master_id?.name || "—"}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-[12px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    {assignment.assignment_type || "Subject Teacher"}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${assignment.status === "Active" ? "bg-success/10 text-success" : "bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${assignment.status === "Active" ? "bg-success" : "bg-rose-500"}`} />
                                    {assignment.status || "Active"}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isAdmin && (
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => startEdit(assignment)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors" title="Edit">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => { setSelectedAssignment(assignment); setIsDeleteOpen(true); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-6">
                {paginatedGroups.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-slate-500">
                    No assignments matching criteria.
                  </div>
                ) : (
                  paginatedGroups.map((group, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col break-inside-avoid mb-6">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-blue-100/50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <h3 className="font-bold text-slate-900 dark:text-white text-[16px] truncate">
                              {group.class.name} {group.class.section ? `- ${group.class.section}` : ""}
                            </h3>
                            <p className="text-[12px] font-medium text-slate-500 mt-0.5 truncate">
                              {filterYear || academicYear}
                            </p>
                          </div>
                        </div>
                        <Link href={`/academic-mgmt/teacher-assignment/${group.class._id}`} className="px-3 py-1.5 border border-border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/30 rounded-lg text-[12px] font-bold shadow-sm transition-colors cursor-pointer shrink-0">
                          View Details
                        </Link>
                      </div>
                      <div className="p-4">
                        <div className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">
                          Assigned Teachers ({group.assignments.length})
                        </div>
                        <div className="space-y-3">
                          {(expandedGroups[idx] ? group.assignments : group.assignments.slice(0, 3)).map(assignment => (
                            <div key={assignment._id} className="group relative bg-[#F8FAFC] dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg p-3.5 flex items-start gap-3 transition-colors">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0">
                                <img
                                  src={assignment.teacher_id?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignment.teacher_id?.name || "T")}&background=d68600&color=fff&bold=true`}
                                  alt="Teacher Avatar"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-[13px] tracking-wide">
                                  {assignment.teacher_id?.name || "Unknown Teacher"}
                                </h4>
                                <div className="text-[11px] font-medium text-slate-500 mt-0.5 font-sans uppercase flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{assignment?.subject_master_id?.name || "No Subject"}</span>
                                  {assignment.assignment_type && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                      <span className="text-primary">{assignment.assignment_type}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                  <button onClick={() => startEdit(assignment)} className="text-slate-400 hover:text-primary transition-colors p-1" title="Edit">
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => { setSelectedAssignment(assignment); setIsDeleteOpen(true); }} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {group.assignments.length > 3 && (
                          <button
                            onClick={() => setExpandedGroups(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className="w-full mt-3 py-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1.5 bg-primary/5 hover:bg-primary/10 rounded-lg"
                          >
                            {expandedGroups[idx] ? "Show Less" : `+ ${group.assignments.length - 3} More Assignments`}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalGroups}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              className="mt-6 border-t-0"
            />
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Assign Faculty to Class Subject">
        <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-450 text-[13px] font-semibold border border-rose-200/50">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          {/* Custom Searchable Faculty Selection */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Teacher <span className="text-red-500">*</span></label>

            {/* Input Selection Trigger */}
            <div
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground cursor-pointer flex items-center justify-between outline-none focus:border-primary/50"
              onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
            >
              {selectedTeacherDetails ? (
                <div className="flex items-center gap-2">
                  <img
                    src={selectedTeacherDetails.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeacherDetails.name)}&background=d68600&color=fff&bold=true`}
                    className="w-5 h-5 rounded-full object-cover"
                    alt={selectedTeacherDetails.name}
                  />
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedTeacherDetails.name} ({selectedTeacherDetails.employee_id || "No ID"})</span>
                </div>
              ) : (
                <span className="text-slate-400">Select Teacher (Custom Filterable Dropdown)</span>
              )}
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Custom Search list popover */}
            {isTeacherDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsTeacherDropdownOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-border rounded-lg shadow-2xl z-[70] p-3 max-h-[300px] flex flex-col gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search Name/Employee ID/Phone/Email..."
                      value={teacherSearchText}
                      onChange={(e) => setTeacherSearchText(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-slate-50 dark:bg-slate-900 text-foreground"
                    />
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-border/40 custom-scrollbar pr-1 max-h-[200px]">
                    {filteredTeachers.length === 0 ? (
                      <p className="text-slate-450 text-[13px] py-4 text-center">No matching active teachers found.</p>
                    ) : (
                      filteredTeachers.map(t => (
                        <div
                          key={t._id}
                          onClick={() => {
                            setFormTeacherId(t._id);
                            setIsTeacherDropdownOpen(false);
                            setTeacherSearchText("");
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${formTeacherId === t._id ? "bg-primary/10 text-primary" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=d68600&color=fff&bold=true`}
                              className="w-8 h-8 rounded-full object-cover"
                              alt={t.name}
                            />
                            <div className="text-left space-y-0.5">
                              <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {t.name}
                                <span className={`text-[9px] px-1.5 py-0.25 rounded font-bold ${t.is_active ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-955/30 dark:text-rose-455"}`}>
                                  {t.is_active ? "Active" : "Inactive"}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-400 font-semibold">
                                {t.designation || "Teacher"} • {t.department || "Faculty"} • ID: {t.employee_id || "—"}
                              </p>
                              {((t.class_ids && t.class_ids.length > 0) || t.class_id) && (
                                <p className="text-[10px] text-primary font-bold">
                                  Classes: {t.class_ids ? t.class_ids.map((c: any) => typeof c === "object" ? `${c.name} - ${c.section}` : c).join(", ") : (typeof t.class_id === "object" ? `${(t.class_id as any).name} - ${(t.class_id as any).section}` : t.class_id)}
                                </p>
                              )}
                            </div>
                          </div>
                          {formTeacherId === t._id && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Display Active Workload Badge */}
            {selectedTeacherDetails && (
              <div className={`mt-1.5 text-[12px] font-bold flex items-center gap-1.5 ${teacherWorkload >= 40 ? "text-rose-600 dark:text-rose-400" :
                teacherWorkload >= 30 ? "text-amber-600 dark:text-amber-400" :
                  "text-emerald-600 dark:text-emerald-400"
                }`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Current Workload: {teacherWorkload} periods/week</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Class <span className="text-red-500">*</span></label>
              <select
                required
                value={formClassName}
                onChange={(e) => { setFormClassName(e.target.value); setFormSection(""); setSelectedSubjectIds([]); }}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                <option value="">Select Class</option>
                {uniqueClassNames.map(cName => <option key={cName} value={cName}>{cName}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Section <span className="text-red-500">*</span></label>
              <select
                required
                value={formSection}
                onChange={(e) => { setFormSection(e.target.value); setSelectedSubjectIds([]); }}
                disabled={!formClassName}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400"
              >
                <option value="">Select Section</option>
                {availableSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic Subject Multi-Select */}
          {resolvedClass && (
            <div className="flex flex-col gap-2 border border-border/60 rounded-lg p-3.5 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-slate-750 dark:text-slate-200">Subjects to Assign <span className="text-red-500">*</span></label>
                {selectedSubjectIds.length > 0 && (
                  <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {selectedSubjectIds.length} selected (+{addedWorkload} periods/week)
                  </span>
                )}
              </div>

              {availableSubjectsForClass.length === 0 ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No active subjects are assigned to this class. Add Subject Assignments first!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {availableSubjectsForClass.map(s => {
                    const isChecked = selectedSubjectIds.includes(s._id);
                    return (
                      <label
                        key={s._id}
                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${isChecked
                          ? "bg-primary/5 border-primary/50 text-primary dark:bg-primary/10"
                          : "bg-white border-border hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedSubjectIds(prev =>
                              prev.includes(s._id) ? prev.filter(id => id !== s._id) : [...prev, s._id]
                            );
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 accent-primary cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[12px] font-bold truncate leading-tight">{s.name}</p>
                          {s.subject_code && <p className="font-sans text-[9px] text-slate-400 mt-0.5">{s.subject_code}</p>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Assignment Type <span className="text-red-500">*</span></label>
              <select
                required
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                {ASSIGNMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Academic Year <span className="text-red-500">*</span></label>
              <select
                required
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50 font-sans"
              >
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Effective Date</label>
              <input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Remarks / Audit Comments</label>
            <textarea
              rows={2}
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="e.g. Assigned to replace former subject teacher or co-class lead"
              className="w-full px-3.5 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-bold rounded-lg text-white shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Assignment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelectedAssignment(null); }} title="Edit Teacher Assignment">
        <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-455 text-[13px] font-semibold border border-rose-200/50">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          {/* Custom Searchable Faculty Selection for Edit */}
          <div className="flex flex-col gap-1.5 relative font-normal text-left">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Teacher <span className="text-red-500">*</span></label>

            {/* Input Selection Trigger */}
            <div
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground cursor-pointer flex items-center justify-between outline-none focus:border-primary/50"
              onClick={() => setIsEditTeacherDropdownOpen(!isEditTeacherDropdownOpen)}
            >
              {selectedEditTeacherDetails ? (
                <div className="flex items-center gap-2">
                  <img
                    src={selectedEditTeacherDetails.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEditTeacherDetails.name)}&background=d68600&color=fff&bold=true`}
                    className="w-5 h-5 rounded-full object-cover"
                    alt={selectedEditTeacherDetails.name}
                  />
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedEditTeacherDetails.name} ({selectedEditTeacherDetails.employee_id || "No ID"})</span>
                </div>
              ) : (
                <span className="text-slate-400">Select Teacher</span>
              )}
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Custom Search list popover */}
            {isEditTeacherDropdownOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsEditTeacherDropdownOpen(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-border rounded-lg shadow-2xl z-[70] p-3 max-h-[300px] flex flex-col gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search Name/Employee ID/Phone/Email..."
                      value={editTeacherSearchText}
                      onChange={(e) => setEditTeacherSearchText(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-slate-50 dark:bg-slate-900 text-foreground"
                    />
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-border/40 custom-scrollbar pr-1 max-h-[200px]">
                    {filteredEditTeachers.length === 0 ? (
                      <p className="text-slate-450 text-[13px] py-4 text-center">No matching active teachers found.</p>
                    ) : (
                      filteredEditTeachers.map(t => (
                        <div
                          key={t._id}
                          onClick={() => {
                            setEditTeacherId(t._id);
                            setIsEditTeacherDropdownOpen(false);
                            setEditTeacherSearchText("");
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${editTeacherId === t._id ? "bg-primary/10 text-primary" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=d68600&color=fff&bold=true`}
                              className="w-8 h-8 rounded-full object-cover"
                              alt={t.name}
                            />
                            <div className="text-left space-y-0.5">
                              <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {t.name}
                                <span className={`text-[9px] px-1.5 py-0.25 rounded font-bold ${t.is_active ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-955/30 dark:text-rose-455"}`}>
                                  {t.is_active ? "Active" : "Inactive"}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-400 font-semibold">
                                {t.designation || "Teacher"} • {t.department || "Faculty"} • ID: {t.employee_id || "—"}
                              </p>
                              {((t.class_ids && t.class_ids.length > 0) || t.class_id) && (
                                <p className="text-[10px] text-primary font-bold">
                                  Classes: {t.class_ids ? t.class_ids.map((c: any) => typeof c === "object" ? `${c.name} - ${c.section}` : c).join(", ") : (typeof t.class_id === "object" ? `${(t.class_id as any).name} - ${(t.class_id as any).section}` : t.class_id)}
                                </p>
                              )}
                            </div>
                          </div>
                          {editTeacherId === t._id && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Display Active Workload Badge */}
            {selectedEditTeacherDetails && (
              <div className={`mt-1.5 text-[12px] font-bold flex items-center gap-1.5 ${editTeacherWorkload >= 40 ? "text-rose-600 dark:text-rose-400" :
                editTeacherWorkload >= 30 ? "text-amber-600 dark:text-amber-400" :
                  "text-emerald-600 dark:text-emerald-400"
                }`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Current Workload: {editTeacherWorkload} periods/week</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Class <span className="text-red-500">*</span></label>
            <select
              required
              value={editClassId}
              onChange={(e) => setEditClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
            >
              {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section ? ` - ${c.section}` : ""}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Subject <span className="text-red-500">*</span></label>
            <select
              required
              value={editSubjectId}
              onChange={(e) => setEditSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
            >
              {subjectList.map(s => <option key={s._id} value={s._id}>{s.name} {s.subject_code ? `(${s.subject_code})` : ""}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Assignment Type <span className="text-red-500">*</span></label>
              <select
                required
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                {ASSIGNMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Academic Year <span className="text-red-500">*</span></label>
              <select
                required
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50 font-sans"
              >
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Effective Date</label>
              <input
                type="date"
                value={editEffectiveDate}
                onChange={(e) => setEditEffectiveDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-205">Remarks / Audit Comments</label>
            <textarea
              rows={2}
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
              className="w-full px-3.5 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-foreground outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => { setIsEditOpen(false); setSelectedAssignment(null); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-bold rounded-lg text-white shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Update Assignment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Teacher Assignment">
        <div className="space-y-4 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to remove this teacher assignment?
            <br />
            This will soft-delete the assignment of <span className="font-bold text-foreground dark:text-white">{selectedAssignment?.teacher_id?.name}</span> teaching <span className="font-bold text-foreground dark:text-white">{selectedAssignment?.subject_master_id?.name}</span> in <span className="font-bold text-foreground dark:text-white">{selectedAssignment?.class_id?.name}</span>.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-850 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-[13px] font-bold rounded-lg text-white shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Remove Assignment</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Workload Warning Modal */}
      <Modal isOpen={isWorkloadWarningOpen} onClose={() => setIsWorkloadWarningOpen(false)} title="Excessive Teacher Workload Warning">
        <div className="space-y-4 text-left">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-400 border border-amber-200/50">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Excessive Period Workload Warning</p>
              <p className="text-xs mt-1">
                The selected teacher <strong>{pendingSubmitData?.isEdit ? selectedEditTeacherDetails?.name : selectedTeacherDetails?.name}</strong> has a current workload of <strong>{pendingSubmitData?.isEdit ? editTeacherWorkload : teacherWorkload}</strong> periods/week.
                Adding this assignment will bring their total workload to <strong>{pendingSubmitData?.isEdit ? (editTeacherWorkload + (subjectAssignments.find(a => a.subject_master_id?._id === editSubjectId && (typeof a.class_id === "object" ? a.class_id?._id : a.class_id) === editClassId && a.academic_year === editYear)?.weekly_periods || 0)) : (teacherWorkload + addedWorkload)}</strong> periods/week (standard limit is 40).
              </p>
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-350 text-[13px]">
            Do you wish to proceed and save this assignment anyway?
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsWorkloadWarningOpen(false)}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-850 dark:text-slate-100 text-[13px] font-bold rounded-lg cursor-pointer"
            >
              No, Cancel
            </button>
            <button
              onClick={async () => {
                if (pendingSubmitData?.isEdit) {
                  await executeEditAssignment(pendingSubmitData.id, pendingSubmitData.payload);
                } else {
                  await executeAddAssignment(pendingSubmitData);
                }
              }}
              disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-bold rounded-lg text-white shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Yes, Save Assignment</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
