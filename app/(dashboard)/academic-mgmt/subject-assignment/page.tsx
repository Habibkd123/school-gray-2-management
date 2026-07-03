"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, RefreshCcw, Trash2, Loader2, AlertCircle,
  Link2, ChevronDown, Filter, BookOpen, Layers, GraduationCap, Edit2,
  Grid, List, ChevronRight, MoreVertical
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { useSubjectAssignment, PopulatedAssignment } from "@/app/hooks/useSubjectAssignment";
import { useSubjectMaster } from "@/app/hooks/useSubjectMaster";
import { useStreams } from "@/app/hooks/useStreams";
import { useClasses } from "@/app/hooks/useClasses";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";

const ACADEMIC_YEARS = ["2026-2027"];

export default function SubjectAssignmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { academicYear } = useAppState();
  const { enableStreams } = useAcademicConfig();

  const { assignments, isLoading, error, fetchAssignments, createAssignment, updateAssignment, deleteAssignment } = useSubjectAssignment();
  const [activeDropdownCardKey, setActiveDropdownCardKey] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [initialSelectedSubjectIds, setInitialSelectedSubjectIds] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<any>(null);

  const handleBulkDelete = async () => {
    if (!groupToDelete) return;
    setSubmitting(true);
    try {
      await Promise.all(
        groupToDelete.subjects.map((sub: any) => deleteAssignment(sub.assignmentId))
      );
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
    setIsBulkDeleteOpen(false);
    setGroupToDelete(null);
    doFetch();
  };
  const { subjects: subjectList } = useSubjectMaster();
  const { streams } = useStreams({ skip: !enableStreams });
  const { classes } = useClasses({ filterByYear: true });

  // Filter state
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStreamId, setFilterStreamId] = useState("");
  const [filterYear, setFilterYear] = useState(academicYear);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedClassKey, setExpandedClassKey] = useState<string | null>(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<PopulatedAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Add Form state
  const [formYear, setFormYear] = useState(academicYear);
  const [formClassId, setFormClassId] = useState("");
  const [formStreamId, setFormStreamId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Edit Form state
  const [editYear, setEditYear] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editStreamId, setEditStreamId] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");

  const doFetch = useCallback(() => {
    fetchAssignments({
      class_id: filterClassId || undefined,
      stream_id: filterStreamId || undefined,
      academic_year: filterYear || undefined,
      limit: 500,
    });
  }, [fetchAssignments, filterClassId, filterStreamId, filterYear]);

  useEffect(() => { doFetch(); }, [doFetch]);

  // Sync edit form fields when selection changes
  useEffect(() => {
    if (selected) {
      setEditYear(selected.academic_year);
      setEditClassId(selected.class_id ? (typeof selected.class_id === "object" ? selected.class_id._id : selected.class_id) : "");
      setEditStreamId(selected.stream_id ? (typeof selected.stream_id === "object" ? selected.stream_id._id : selected.stream_id) : "");
      setEditSubjectId(typeof selected.subject_master_id === "object" ? selected.subject_master_id._id : selected.subject_master_id);
    }
  }, [selected]);

  // Auto stream selection on class select (for Add Modal)
  useEffect(() => {
    if (!formClassId || !enableStreams) {
      setFormStreamId("");
      return;
    }
    const selectedClass = classes.find(c => c._id === formClassId);
    if (!selectedClass) {
      setFormStreamId("");
      return;
    }

    const isHigherClass = selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12");
    if (!isHigherClass) {
      setFormStreamId("");
      return;
    }

    const activeStreams = streams.filter(s => s.status === "Active");
    let foundStreamId = "";
    for (const stream of activeStreams) {
      const escapedStreamName = stream.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedStreamName}\\b`, 'i');
      if (regex.test(selectedClass.name)) {
        foundStreamId = stream._id;
        break;
      }
    }
    setFormStreamId(foundStreamId);
  }, [formClassId, classes, streams, enableStreams]);

  const filteredStreams = useMemo(() => {
    if (!enableStreams || !formClassId) return [];
    const selectedClass = classes.find(c => c._id === formClassId);
    if (!selectedClass) return [];

    const isHigherClass = selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12");
    if (!isHigherClass) return [];

    const activeStreams = streams.filter(s => s.status === "Active");
    const matchedStreams = activeStreams.filter(stream => {
      const escapedStreamName = stream.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedStreamName}\\b`, 'i');
      return regex.test(selectedClass.name);
    });

    return matchedStreams.length > 0 ? matchedStreams : activeStreams;
  }, [formClassId, classes, streams, enableStreams]);

  const filteredSubjectList = useMemo(() => {
    const selectedClass = classes.find(c => c._id === formClassId);
    const isHigherClass = selectedClass ? (selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12")) : false;

    const list = subjectList.filter(s => s.status === "Active");
    if (!enableStreams || !formStreamId || !isHigherClass) return list;

    return list.filter(s => {
      if (!s.allowed_streams || s.allowed_streams.length === 0) return true;
      return s.allowed_streams.includes(formStreamId);
    });
  }, [subjectList, formStreamId, enableStreams, formClassId, classes]);

  const resetForm = () => {
    setFormYear(academicYear);
    setFormClassId("");
    setFormStreamId("");
    setSelectedSubjectIds([]);
    setSubjectSearch("");
    setFormError("");
    setIsEditingGroup(false);
    setInitialSelectedSubjectIds([]);
    setEditingGroup(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYear || !formClassId) {
      setFormError("Academic year and class are required.");
      return;
    }
    if (selectedSubjectIds.length === 0) {
      setFormError("Select at least one subject to assign.");
      return;
    }

    const selectedClass = classes.find(c => c._id === formClassId);
    const isHigherClass = selectedClass ? (selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12")) : false;

    if (isEditingGroup) {
      const subjectsToDelete = initialSelectedSubjectIds.filter(id => !selectedSubjectIds.includes(id));
      const subjectsToAdd = selectedSubjectIds.filter(id => !initialSelectedSubjectIds.includes(id));
      const assignmentsToDelete = subjectsToDelete.map(subjId => {
        const sub = editingGroup?.subjects?.find((s: any) => s.subjectId === subjId);
        return sub?.assignmentId;
      }).filter(Boolean);

      setSubmitting(true);
      setFormError("");
      try {
        if (assignmentsToDelete.length > 0) {
          await Promise.all(assignmentsToDelete.map(id => deleteAssignment(id)));
        }
        if (subjectsToAdd.length > 0) {
          const res = await createAssignment({
            academic_year: formYear,
            class_id: formClassId,
            stream_id: enableStreams && isHigherClass && formStreamId ? formStreamId : undefined,
            subject_master_ids: subjectsToAdd,
          });
          if (!res.success) {
            setFormError(res.message);
            setSubmitting(false);
            return;
          }
        }
        setIsAddOpen(false);
        resetForm();
        doFetch();
      } catch (err: any) {
        setFormError(err.message || "Failed to update assignments");
      } finally {
        setSubmitting(false);
      }
    } else {
      setSubmitting(true);
      setFormError("");
      const res = await createAssignment({
        academic_year: formYear,
        class_id: formClassId,
        stream_id: enableStreams && isHigherClass && formStreamId ? formStreamId : undefined,
        subject_master_ids: selectedSubjectIds,
      });
      setSubmitting(false);

      if (res.success) {
        setIsAddOpen(false);
        resetForm();
        doFetch();
      } else {
        setFormError(res.message);
      }
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    if (!editYear || !editClassId || !editSubjectId) {
      setFormError("Year, class, and subject are required.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    const res = await updateAssignment(selected._id, {
      academic_year: editYear,
      class_id: editClassId,
      stream_id: editStreamId || undefined,
      subject_master_id: editSubjectId,
    });
    setSubmitting(false);

    if (res.success) {
      setIsEditOpen(false);
      setSelected(null);
      doFetch();
    } else {
      setFormError(res.message);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    await deleteAssignment(selected._id);
    setSubmitting(false);
    setIsDeleteOpen(false);
    setSelected(null);
    doFetch();
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  // Group-by Class/Stream/Group calculation
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, {
      isGroup: boolean;
      class_id?: string;
      className: string;
      section?: string;
      streamName?: string;
      stream_id?: string;
      academic_year: string;
      subjects: {
        assignmentId: string;
        subjectId: string;
        name: string;
        code?: string;
        originalRecord: PopulatedAssignment;
      }[];
    }> = {};

    assignments.forEach(a => {
      let key = "";
      let groupDetails: any = {};

      const classId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
      const className = typeof a.class_id === "object" ? a.class_id?.name : "Class";
      const section = typeof a.class_id === "object" ? a.class_id?.section : "";
      const streamId = a.stream_id ? (typeof a.stream_id === "object" ? a.stream_id._id : a.stream_id) : "";
      const streamName = a.stream_id ? (typeof a.stream_id === "object" ? a.stream_id.name : "Stream") : "";
      key = `${classId}-${streamId}-${a.academic_year}`;
      groupDetails = {
        isGroup: false,
        class_id: classId,
        className,
        section,
        stream_id: streamId || undefined,
        streamName: streamName || undefined,
        academic_year: a.academic_year,
        subjects: [],
      };

      const matchesSearch = !searchQuery || 
        (typeof a.subject_master_id === "object" && a.subject_master_id?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        groupDetails.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (groupDetails.streamName && groupDetails.streamName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return;

      if (!groups[key]) {
        groups[key] = groupDetails;
      }
      groups[key].subjects.push({
        assignmentId: a._id,
        subjectId: typeof a.subject_master_id === "object" ? a.subject_master_id._id : a.subject_master_id,
        name: typeof a.subject_master_id === "object" ? a.subject_master_id.name : "Subject",
        code: typeof a.subject_master_id === "object" ? a.subject_master_id.subject_code : undefined,
        originalRecord: a,
      });
    });

    return Object.values(groups);
  }, [assignments, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-slate-900 dark:text-slate-100">Subject Assignment</h1>
          <div className="flex items-center gap-2 text-[14px] text-slate-500 mt-1 font-medium dark:text-slate-400">
            <span>Academic Management</span><span>/</span>
            <span className="text-slate-900 dark:text-slate-200">Subject Assignment</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-slate-100/50 dark:bg-slate-800/50 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              title="Accordion List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button onClick={doFetch} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm cursor-pointer dark:text-slate-400">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#d68600] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer">
              <Plus className="w-4 h-4" /><span>Assign Subjects (Bulk)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[140px] text-left">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Academic Year</label>
            <div className="relative">
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                <option value="">All Years</option>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[150px] text-left">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Class</label>
            <div className="relative">
              <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 min-w-[140px] text-left">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Stream</label>
              <div className="relative">
                <select value={filterStreamId} onChange={(e) => setFilterStreamId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                  <option value="">All Streams</option>
                  {streams.filter(s => s.status === "Active").map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px] text-left">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input type="text" placeholder="Search assigned subjects or classes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full focus:border-[#10B981]/50 transition-colors bg-[#F8FAFC] dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Grid View */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-[14px] font-medium">Loading assignments...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500 bg-white dark:bg-slate-900 border border-border rounded-xl">
          <AlertCircle className="w-6 h-6" /><p className="text-[14px] font-medium">{error}</p>
        </div>
      ) : groupedAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white dark:bg-slate-900 border border-border rounded-xl">
          <Link2 className="w-10 h-10 opacity-30" />
          <p className="text-[14px] font-medium">No subject assignments found</p>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="px-4 py-2 text-[13px] font-bold bg-primary hover:bg-[#d68600] text-white rounded-lg cursor-pointer">
              Assign First Subject
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {groupedAssignments.map((group, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left hover:shadow-md transition-shadow h-fit">
              <div>
                {/* Header of group */}
                <div className="p-4 border-b border-border bg-[#F8FAFC] dark:bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-[14px] text-slate-900 dark:text-white leading-tight">
                          {group.className}{group.section ? ` - ${group.section}` : ""}
                        </h4>
                      </div>
                      {group.streamName && (
                        <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {group.streamName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative">
                    <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300">
                      {group.academic_year}
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cardKey = `${group.class_id}-${group.stream_id || ""}-${group.academic_year}`;
                          setActiveDropdownCardKey(activeDropdownCardKey === cardKey ? null : cardKey);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeDropdownCardKey === `${group.class_id}-${group.stream_id || ""}-${group.academic_year}` && (
                        <>
                          <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveDropdownCardKey(null); }} />
                          <div className="absolute right-0 top-7 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left font-medium">
                            <button
                              type="button"
                              onClick={() => {
                                router.push(`/academic-mgmt/subject-assignment/details?classId=${group.class_id}&streamId=${group.stream_id || ""}&year=${group.academic_year}`);
                                setActiveDropdownCardKey(null);
                              }}
                              className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                            >
                              👁 View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormClassId(group.class_id || "");
                                setFormYear(group.academic_year);
                                setFormStreamId(group.stream_id || "");
                                const currentSubIds = group.subjects.map((s: any) => s.subjectId);
                                setSelectedSubjectIds(currentSubIds);
                                setInitialSelectedSubjectIds(currentSubIds);
                                setEditingGroup(group);
                                setIsEditingGroup(true);
                                setIsAddOpen(true);
                                setActiveDropdownCardKey(null);
                              }}
                              className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                            >
                              ✏ Edit
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setGroupToDelete(group);
                                  setIsBulkDeleteOpen(true);
                                  setActiveDropdownCardKey(null);
                                }}
                                className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 transition-colors cursor-pointer"
                              >
                                🗑 Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assigned subjects checklist */}
                <div className="p-4 space-y-3">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Assigned Subjects ({group.subjects.length})</p>
                  <div className="flex flex-col gap-2">
                    {group.subjects.map((sub, sIdx) => (
                      <div key={sIdx} className="group flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-[#FAFBFD] dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{sub.name}</p>
                            {sub.code && <p className="text-[10px] font-mono text-slate-400">Code: {sub.code}</p>}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setSelected(sub.originalRecord); setIsEditOpen(true); }}
                              className="p-1 text-slate-400 hover:text-primary rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setSelected(sub.originalRecord); setIsDeleteOpen(true); }}
                              className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedAssignments.map((group, idx) => {
            const groupKey = `${group.class_id || ""}-${group.stream_id || ""}-${group.academic_year}`;
            const isExpanded = expandedClassKey === groupKey;
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left hover:shadow-md transition-shadow duration-300">
                <button
                  type="button"
                  onClick={() => setExpandedClassKey(isExpanded ? null : groupKey)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4.5 h-4.5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[14px] text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                        {group.className}{group.section ? ` - ${group.section}` : ""}
                        {group.streamName && (
                          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/25 px-2 py-0.5 rounded flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {group.streamName}
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-2.5 py-0.5 rounded">
                      {group.subjects.length} Subjects
                    </span>
                    <div className="flex items-center gap-2 relative">
                      <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300">
                        {group.academic_year}
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const cardKey = `list-${group.class_id}-${group.stream_id || ""}-${group.academic_year}`;
                            setActiveDropdownCardKey(activeDropdownCardKey === cardKey ? null : cardKey);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdownCardKey === `list-${group.class_id}-${group.stream_id || ""}-${group.academic_year}` && (
                          <>
                            <div className="fixed inset-0 z-45" onClick={(e) => { e.stopPropagation(); setActiveDropdownCardKey(null); }} />
                            <div className="absolute right-0 top-7 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left font-medium">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/academic-mgmt/subject-assignment/details?classId=${group.class_id}&streamId=${group.stream_id || ""}&year=${group.academic_year}`);
                                  setActiveDropdownCardKey(null);
                                }}
                                className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                              >
                                👁 View Details
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormClassId(group.class_id || "");
                                  setFormYear(group.academic_year);
                                  setFormStreamId(group.stream_id || "");
                                  const currentSubIds = group.subjects.map((s: any) => s.subjectId);
                                  setSelectedSubjectIds(currentSubIds);
                                  setInitialSelectedSubjectIds(currentSubIds);
                                  setEditingGroup(group);
                                  setIsEditingGroup(true);
                                  setIsAddOpen(true);
                                  setActiveDropdownCardKey(null);
                                }}
                                className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer"
                              >
                                ✏ Edit
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGroupToDelete(group);
                                    setIsBulkDeleteOpen(true);
                                    setActiveDropdownCardKey(null);
                                  }}
                                  className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-3 transition-colors cursor-pointer"
                                >
                                  🗑 Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[1000px] border-t border-border opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                  }`}
                >
                  <div className="p-5 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.subjects.map((sub, sIdx) => (
                        <div key={sIdx} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition-all duration-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-850 rounded-lg flex items-center justify-center shrink-0">
                              <BookOpen className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{sub.name}</p>
                              {sub.code && <p className="text-[10px] font-mono text-slate-400">Code: {sub.code}</p>}
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelected(sub.originalRecord); setIsEditOpen(true); }}
                                className="p-1 text-slate-400 hover:text-primary rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelected(sub.originalRecord); setIsDeleteOpen(true); }}
                                className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Bulk Assignment Modal */}
      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title={isEditingGroup ? "Edit Assigned Subjects" : "Assign Subjects (Bulk)"}>
        <form onSubmit={handleAdd} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Academic Year <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formYear} onChange={(e) => setFormYear(e.target.value)} disabled={isEditingGroup}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500">
                  <option value="">Select Year</option>
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Class <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formClassId} onChange={(e) => setFormClassId(e.target.value)} disabled={isEditingGroup}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {enableStreams && filteredStreams.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                Stream <span className="text-slate-400 text-[11px]">(optional — leave blank for all streams)</span>
              </label>
              <div className="relative">
                <select value={formStreamId} onChange={(e) => setFormStreamId(e.target.value)} disabled={isEditingGroup}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500">
                  <option value="">No specific stream</option>
                  {filteredStreams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Bulk checklist selection of subjects */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Select Subjects to Assign <span className="text-red-500">*</span></label>
              {selectedSubjectIds.length > 0 && (
                <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {selectedSubjectIds.length} selected
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-[#F8FAFC] dark:bg-slate-800 focus:border-primary/50 transition-colors"
              />
            </div>

            {(() => {
              // Already assigned subject IDs for the selected class (from existing data)
              const alreadyAssignedIds = isEditingGroup ? new Set() : new Set(
                assignments
                  .filter(a => {
                    const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
                    return aClassId === formClassId;
                  })
                  .map(a => typeof a.subject_master_id === "object" ? a.subject_master_id._id : a.subject_master_id)
              );

              const displayList = filteredSubjectList.filter(s =>
                !subjectSearch || s.name.toLowerCase().includes(subjectSearch.toLowerCase())
              );

              const availableSubjects = displayList.filter(s => !alreadyAssignedIds.has(s._id));
              const alreadyAssignedSubjects = displayList.filter(s => alreadyAssignedIds.has(s._id));

              return (
                <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {availableSubjects.length === 0 && alreadyAssignedSubjects.length === 0 && (
                    <p className="text-[13px] text-slate-400 text-center py-6 font-medium">No active subjects available</p>
                  )}
                  {availableSubjects.length === 0 && alreadyAssignedSubjects.length > 0 && (
                    <p className="text-[13px] text-slate-400 text-center py-4 font-medium">All subjects are already assigned to this class</p>
                  )}
                  {availableSubjects.length > 0 && (
                    <div className="max-h-[200px] overflow-y-auto">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800/50 border-b border-border">{isEditingGroup ? "Assigned & Available Subjects" : "Available to assign"}</p>
                      {availableSubjects.map(sub => {
                        const isChecked = selectedSubjectIds.includes(sub._id);
                        return (
                          <label key={sub._id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${
                            isChecked ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSubjectSelection(sub._id)}
                              className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer shrink-0"
                            />
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className={`text-[13px] font-medium truncate ${
                                isChecked ? "text-primary font-semibold" : "text-slate-700 dark:text-slate-200"
                              }`}>{sub.name}</span>
                              {sub.subject_code && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-2 shrink-0">{sub.subject_code}</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {alreadyAssignedSubjects.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800/50 border-t border-b border-border">Already assigned</p>
                      {alreadyAssignedSubjects.map(sub => (
                        <div key={sub._id} className="flex items-center gap-3 px-4 py-2.5 opacity-50 cursor-not-allowed border-b border-border/50 last:border-0">
                          <input type="checkbox" checked disabled className="rounded border-slate-300 w-4 h-4 cursor-not-allowed shrink-0" />
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 truncate">{sub.name}</span>
                            {sub.subject_code && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-2 shrink-0">{sub.subject_code}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[#d68600] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} {isEditingGroup ? "Save Changes" : "Bulk Assign"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelected(null); }} title="Edit Subject Assignment">
        <form onSubmit={handleEdit} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Academic Year <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={editYear} onChange={(e) => setEditYear(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Class <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={editClassId} onChange={(e) => setEditClassId(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {enableStreams && streams.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Stream</label>
              <div className="relative">
                <select value={editStreamId} onChange={(e) => setEditStreamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                  <option value="">No specific stream</option>
                  {streams.filter(s => s.status === "Active").map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Subject <span className="text-red-500">*</span></label>
            <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              {(() => {
                // All subjects assigned to this class EXCEPT the current one being edited
                const currentSubjectId = typeof selected?.subject_master_id === "object" ? selected.subject_master_id._id : selected?.subject_master_id;
                const alreadyAssignedIds = new Set(
                  assignments
                    .filter(a => {
                      const aClassId = typeof a.class_id === "object" ? a.class_id?._id : a.class_id;
                      return aClassId === editClassId && (typeof a.subject_master_id === "object" ? a.subject_master_id._id : a.subject_master_id) !== currentSubjectId;
                    })
                    .map(a => typeof a.subject_master_id === "object" ? a.subject_master_id._id : a.subject_master_id)
                );
                const activeSubjects = subjectList.filter(s => s.status === "Active");
                const available = activeSubjects.filter(s => !alreadyAssignedIds.has(s._id));
                const blocked = activeSubjects.filter(s => alreadyAssignedIds.has(s._id));
                return (
                  <div className="max-h-[220px] overflow-y-auto">
                    {available.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800/50 border-b border-border sticky top-0">Available</p>
                        {available.map(s => (
                          <label key={s._id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border/50 last:border-0 transition-colors ${
                            editSubjectId === s._id ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}>
                            <input
                              type="radio"
                              name="editSubject"
                              checked={editSubjectId === s._id}
                              onChange={() => setEditSubjectId(s._id)}
                              className="text-primary focus:ring-primary w-4 h-4 cursor-pointer shrink-0"
                            />
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className={`text-[13px] font-medium truncate ${
                                editSubjectId === s._id ? "text-primary font-semibold" : "text-slate-700 dark:text-slate-200"
                              }`}>{s.name}</span>
                              {s.subject_code && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-2 shrink-0">{s.subject_code}</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </>
                    )}
                    {blocked.length > 0 && (
                      <>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 bg-[#F8FAFC] dark:bg-slate-800/50 border-t border-b border-border sticky top-0">Already assigned (unavailable)</p>
                        {blocked.map(s => (
                          <div key={s._id} className="flex items-center gap-3 px-4 py-2.5 opacity-40 cursor-not-allowed border-b border-border/50 last:border-0">
                            <input type="radio" disabled className="w-4 h-4 shrink-0 cursor-not-allowed" />
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span className="text-[13px] font-medium text-slate-500 truncate">{s.name}</span>
                              {s.subject_code && (
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-2 shrink-0">{s.subject_code}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {activeSubjects.length === 0 && (
                      <p className="text-[13px] text-slate-400 text-center py-6 font-medium">No active subjects found</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsEditOpen(false); setSelected(null); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-[#d68600] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Update Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => { setIsDeleteOpen(false); setSelected(null); }} title="Remove Assignment">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to remove this subject assignment?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-foreground dark:text-slate-100 text-[14px] font-bold rounded-lg cursor-pointer">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Remove
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal isOpen={isBulkDeleteOpen} onClose={() => { setIsBulkDeleteOpen(false); setGroupToDelete(null); }} title="Remove Class Subject Assignments">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Are you sure you want to remove all assigned subjects from{" "}
            <span className="font-bold text-foreground dark:text-white">
              {groupToDelete?.className}{groupToDelete?.section ? ` - ${groupToDelete.section}` : ""}
            </span> for the academic year <span className="font-bold text-primary">{groupToDelete?.academic_year}</span>?
            <br /><br />
            This will delete all {groupToDelete?.subjects?.length} subject assignment records.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setIsBulkDeleteOpen(false); setGroupToDelete(null); }} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-[14px] font-bold rounded-lg cursor-pointer">Cancel</button>
            <button onClick={handleBulkDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2 cursor-pointer">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Remove All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
