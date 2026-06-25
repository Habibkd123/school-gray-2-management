"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, RefreshCcw, Trash2, Loader2, AlertCircle,
  Link2, ChevronDown, Filter, BookOpen, Layers, GraduationCap
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { useSubjectAssignment, PopulatedAssignment } from "@/app/hooks/useSubjectAssignment";
import { useSubjectMaster } from "@/app/hooks/useSubjectMaster";
import { useStreams } from "@/app/hooks/useStreams";
import { useClasses } from "@/app/hooks/useClasses";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";

const ACADEMIC_YEARS = ["2026-2027"];

export default function SubjectAssignmentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { academicYear } = useAppState();
  const { enableStreams } = useAcademicConfig();

  const { assignments, isLoading, error, total, fetchAssignments, createAssignment, deleteAssignment } = useSubjectAssignment();
  const { subjects: subjectList } = useSubjectMaster();
  const { streams } = useStreams({ skip: !enableStreams });
  const { classes } = useClasses({ filterByYear: true });

  // Filter state
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStreamId, setFilterStreamId] = useState("");
  const [filterYear, setFilterYear] = useState(academicYear);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<PopulatedAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form
  const [formYear, setFormYear] = useState(academicYear);
  const [formClassId, setFormClassId] = useState("");
  const [formStreamId, setFormStreamId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");

  const doFetch = useCallback(() => {
    fetchAssignments({
      class_id: filterClassId || undefined,
      stream_id: filterStreamId || undefined,
      academic_year: filterYear || undefined,
      limit: 100,
    });
  }, [fetchAssignments, filterClassId, filterStreamId, filterYear]);

  useEffect(() => { doFetch(); }, [doFetch]);

  // Trigger auto stream selection on class select
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

    if (matchedStreams.length > 0) {
      return matchedStreams;
    }

    return activeStreams;
  }, [formClassId, classes, streams, enableStreams]);

  // Strict stream filtering based on SubjectMaster allowed_streams
  const filteredSubjectList = useMemo(() => {
    const selectedClass = classes.find(c => c._id === formClassId);
    const isHigherClass = selectedClass ? (selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12")) : false;

    if (!enableStreams || !formStreamId || !isHigherClass) return subjectList;

    return subjectList.filter(s => {
      // Common subject (not restricted to any stream)
      if (!s.allowed_streams || s.allowed_streams.length === 0) return true;
      // Stream-specific subject
      return s.allowed_streams.includes(formStreamId);
    });
  }, [subjectList, formStreamId, enableStreams, formClassId, classes]);

  const resetForm = () => { setFormYear(academicYear); setFormClassId(""); setFormStreamId(""); setFormSubjectId(""); setFormError(""); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYear || !formClassId || !formSubjectId) {
      setFormError("Academic year, class, and subject are all required."); return;
    }

    // Stream-conflict check: subject must not already be assigned to a DIFFERENT stream for same class+year
    if (enableStreams && formStreamId && formSubjectId) {
      const conflict = assignments.find(a => {
        const aSubjectId = typeof a.subject_master_id === "object" ? a.subject_master_id?._id : a.subject_master_id;
        const aClassId = typeof a.class_id === "object" ? a.class_id._id : a.class_id;
        const aStreamId = typeof a.stream_id === "object" ? a.stream_id?._id : a.stream_id;
        return (
          aSubjectId === formSubjectId &&
          aClassId === formClassId &&
          a.academic_year === formYear &&
          aStreamId != null &&
          aStreamId !== formStreamId
        );
      });
      if (conflict) {
        const conflictStreamName = typeof conflict.stream_id === "object" ? conflict.stream_id?.name : conflict.stream_id;
        const selectedSubjectName = subjectList.find(s => s._id === formSubjectId)?.name || "This subject";
        const selectedStreamName = streams.find(s => s._id === formStreamId)?.name || "selected stream";
        setFormError(
          `"${selectedSubjectName}" is already assigned to the ${conflictStreamName} stream for this class. It cannot be added to ${selectedStreamName} as well.`
        );
        return;
      }
    }

    const selectedClass = classes.find(c => c._id === formClassId);
    const isHigherClass = selectedClass ? (selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12")) : false;

    setSubmitting(true);
    const res = await createAssignment({
      academic_year: formYear,
      class_id: formClassId,
      stream_id: enableStreams && isHigherClass && formStreamId ? formStreamId : undefined,
      subject_master_id: formSubjectId,
    });
    setSubmitting(false);
    if (res.success) {
      setIsAddOpen(false); resetForm(); doFetch();
    } else {
      setFormError(res.message);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    await deleteAssignment(selected._id);
    setSubmitting(false); setIsDeleteOpen(false);
    doFetch();
  };

  // Filter displayed assignments by search
  const filteredAssignments = assignments.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.subject_master_id?.name?.toLowerCase().includes(q) ||
      a.class_id?.name?.toLowerCase().includes(q) ||
      (a.stream_id?.name?.toLowerCase().includes(q) ?? false)
    );
  });

  const columns: ColumnDef<PopulatedAssignment>[] = [
    { header: "#", accessorKey: "_id", render: (a: PopulatedAssignment) => <span className="text-slate-400 text-[13px]">—</span> },
    { header: "Academic Year", accessorKey: "academic_year", render: (a) => (
      <span className="font-mono text-[12px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{a.academic_year}</span>
    )},
    { header: "Class", accessorKey: "class_id", render: (a) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-blue-500/10 rounded flex items-center justify-center"><GraduationCap className="w-3.5 h-3.5 text-blue-500" /></div>
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {a.class_id?.name}{a.class_id?.section ? ` - ${a.class_id.section}` : ""}
        </span>
      </div>
    )},
    ...(enableStreams ? [{
      header: "Stream", accessorKey: "stream_id",
      render: (a: PopulatedAssignment) => a.stream_id ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-500/10 rounded flex items-center justify-center"><Layers className="w-3.5 h-3.5 text-purple-500" /></div>
          <span className="font-medium text-slate-700 dark:text-slate-300">{a.stream_id.name}</span>
        </div>
      ) : <span className="text-slate-400 text-[13px] italic">—</span>,
    } as ColumnDef<PopulatedAssignment>] : []),
    { header: "Subject", accessorKey: "subject_master_id", render: (a) => (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-[#F59E0B]/10 rounded flex items-center justify-center"><BookOpen className="w-3.5 h-3.5 text-[#F59E0B]" /></div>
        <div>
          <span className="font-bold text-[#F59E0B]">{a.subject_master_id?.name || "—"}</span>
          {a.subject_master_id?.subject_code && (
            <span className="ml-2 text-[11px] font-mono text-slate-400">({a.subject_master_id.subject_code})</span>
          )}
        </div>
      </div>
    )},
    ...(isAdmin ? [{
      header: "Action", sortable: false,
      render: (a: PopulatedAssignment) => (
        <button onClick={() => { setSelected(a); setIsDeleteOpen(true); }}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    } as ColumnDef<PopulatedAssignment>] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-[20px] leading-[24px] font-bold text-[#0F172A] dark:text-slate-100">Subject Assignment</h1>
          <div className="flex items-center gap-2 text-[14px] text-[#68718a] mt-1 font-medium">
            <span>Academic Management</span><span>/</span>
            <span className="text-[#0F172A] dark:text-slate-100">Subject Assignment</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={doFetch} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors">
              <Plus className="w-4 h-4" /><span>Assign Subject</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Academic Year</label>
            <div className="relative">
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                <option value="">All Years</option>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Class</label>
            <div className="relative">
              <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Stream</label>
              <div className="relative">
                <select value={filterStreamId} onChange={(e) => setFilterStreamId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 appearance-none bg-white dark:bg-slate-900 font-medium">
                  <option value="">All Streams</option>
                  {streams.filter(s => s.status === "Active").map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input type="text" placeholder="Search subjects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full focus:border-[#F59E0B]/50 transition-colors bg-[#F8FAFC] dark:bg-[#0F172A]" />
            </div>
          </div>
          <button onClick={doFetch}
            className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 h-[38px]">
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">
        <div className="p-5 border-b border-border text-left">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            Assigned Subjects {!isLoading && <span className="ml-2 text-[13px] font-normal text-slate-400">({filteredAssignments.length})</span>}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-[14px] font-medium">Loading assignments...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" /><p className="text-[14px] font-medium">{error}</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Link2 className="w-10 h-10 opacity-30" />
            <p className="text-[14px] font-medium">No subject assignments found</p>
            <p className="text-[12px] text-slate-400">Assign subjects to classes to get started</p>
            {isAdmin && (
              <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="px-4 py-2 text-[13px] font-bold bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg">
                Assign First Subject
              </button>
            )}
          </div>
        ) : (
          <DataTable columns={columns} data={filteredAssignments}
            selectionHeader={<input type="checkbox" className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] w-4 h-4" />}
            renderSelection={() => <input type="checkbox" className="rounded border-slate-300 text-[#F59E0B] focus:ring-[#F59E0B] w-4 h-4" />}
          />
        )}
      </div>

      {/* Add Assignment Modal */}
      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Assign Subject">
        <form onSubmit={handleAdd} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Academic Year <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formYear} onChange={(e) => setFormYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">Select Year</option>
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Class <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={formClassId} onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {enableStreams && filteredStreams.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">
                Stream <span className="text-slate-400 text-[11px]">(optional — leave blank for all streams)</span>
              </label>
              <div className="relative">
                <select value={formStreamId} onChange={(e) => setFormStreamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">No specific stream</option>
                  {filteredStreams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#0F172A] dark:text-slate-100">Subject <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 appearance-none bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Subject</option>
                {filteredSubjectList.filter(s => s.status === "Active").map(s => (
                  <option key={s._id} value={s._id}>{s.name}{s.subject_code ? ` (${s.subject_code})` : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
            {enableStreams && formStreamId && filteredSubjectList.filter(s => s.status === "Active").length === 0 && (
              <p className="text-[12px] text-red-500 dark:text-red-400 font-medium">
                ⚠ No active subjects are available for the {streams.find(s => s._id === formStreamId)?.name} stream.
                Ensure a subject matching the stream's name or keywords exists in the Subject Master.
              </p>
            )}
            {enableStreams && formStreamId && filteredSubjectList.filter(s => s.status === "Active").length > 0 && (
              <p className="text-[12px] text-slate-400">
                Showing {filteredSubjectList.filter(s => s.status === "Active").length} subject(s) allowed for {streams.find(s => s._id === formStreamId)?.name} stream
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Assign Subject
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Assignment">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Remove <span className="font-bold text-[#F59E0B]">{selected?.subject_master_id?.name}</span> from{" "}
            <span className="font-bold text-[#0F172A] dark:text-white">{selected?.class_id?.name}</span>
            {selected?.stream_id && <> — {selected.stream_id.name}</>}?
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 text-[14px] font-bold rounded-lg">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
