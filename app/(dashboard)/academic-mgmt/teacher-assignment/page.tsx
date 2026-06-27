"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, RefreshCcw, Trash2, Loader2, AlertCircle,
  Link2, ChevronDown, Filter, BookOpen, Layers, GraduationCap, User
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { DataTable, ColumnDef } from "@/app/components/ui/data-table";
import { useTeacherAssignment, PopulatedTeacherAssignment } from "@/app/hooks/useTeacherAssignment";
import { useSubjectMaster } from "@/app/hooks/useSubjectMaster";
import { useStreams } from "@/app/hooks/useStreams";
import { useSections } from "@/app/hooks/useSections";
import { useClasses } from "@/app/hooks/useClasses";
import { useTeachers } from "@/app/hooks/useTeachers";
import { useAcademicConfig } from "@/app/hooks/useAcademicConfig";
import { useAuth } from "@/app/context/auth";
import { useAppState } from "@/app/context/store";

const ACADEMIC_YEARS = ["2026-2027"];

export default function TeacherAssignmentPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin" || user?.role === "super_admin";
  const { academicYear } = useAppState();
  const { enableStreams, enableSections } = useAcademicConfig();

  const { assignments, isLoading, error, fetchAssignments, createAssignment, deleteAssignment } = useTeacherAssignment();
  const { subjects: subjectList } = useSubjectMaster();
  const { streams } = useStreams({ skip: !enableStreams });
  const { sections } = useSections({ skip: !enableSections });
  const { classes } = useClasses({ filterByYear: true });
  const { teachers } = useTeachers();

  // Filter state
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStreamId, setFilterStreamId] = useState("");
  const [filterSectionId, setFilterSectionId] = useState("");
  const [filterTeacherId, setFilterTeacherId] = useState("");
  const [filterYear, setFilterYear] = useState(academicYear);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<PopulatedTeacherAssignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form
  const [formYear, setFormYear] = useState(academicYear);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formStreamId, setFormStreamId] = useState("");
  const [formSectionId, setFormSectionId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");

  const doFetch = useCallback(() => {
    fetchAssignments({
      class_id: filterClassId || undefined,
      stream_id: filterStreamId || undefined,
      section_id: filterSectionId || undefined,
      teacher_id: filterTeacherId || undefined,
      academic_year: filterYear || undefined,
      limit: 200,
    });
  }, [fetchAssignments, filterClassId, filterStreamId, filterSectionId, filterTeacherId, filterYear]);

  useEffect(() => { doFetch(); }, [doFetch]);

  // Trigger auto stream and section selection on class select
  useEffect(() => {
    if (!formClassId) {
      setFormStreamId("");
      setFormSectionId("");
      return;
    }
    const selectedClass = classes.find(c => c._id === formClassId);
    if (!selectedClass) {
      setFormStreamId("");
      setFormSectionId("");
      return;
    }

    // Auto stream selection for Class 11/12
    if (enableStreams) {
      const isHigherClass = selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12");
      if (isHigherClass) {
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
      } else {
        setFormStreamId("");
      }
    } else {
      setFormStreamId("");
    }

    // Auto section selection based on class section
    if (enableSections && selectedClass.section) {
      const matchedSec = sections.find(s => s.name.toLowerCase() === selectedClass.section.toLowerCase());
      if (matchedSec) {
        setFormSectionId(matchedSec._id);
      } else {
        setFormSectionId("");
      }
    } else {
      setFormSectionId("");
    }
  }, [formClassId, classes, streams, enableStreams, sections, enableSections]);

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

  const resetForm = () => {
    setFormYear(academicYear);
    setFormTeacherId("");
    setFormClassId("");
    setFormStreamId("");
    setFormSectionId("");
    setFormSubjectId("");
    setFormError("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYear || !formTeacherId || !formClassId || !formSubjectId) {
      setFormError("Academic year, teacher, class, and subject are all required."); return;
    }
    const selectedClass = classes.find(c => c._id === formClassId);
    const isHigherClass = selectedClass ? (selectedClass.name.startsWith("Class 11") || selectedClass.name.startsWith("Class 12")) : false;

    setSubmitting(true);
    const res = await createAssignment({
      academic_year: formYear,
      teacher_id: formTeacherId,
      class_id: formClassId,
      stream_id: enableStreams && isHigherClass && formStreamId ? formStreamId : undefined,
      section_id: enableSections && formSectionId ? formSectionId : undefined,
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
      a.teacher_id?.name?.toLowerCase().includes(q) ||
      a.subject_master_id?.name?.toLowerCase().includes(q) ||
      a.class_id?.name?.toLowerCase().includes(q) ||
      (a.stream_id?.name?.toLowerCase().includes(q) ?? false) ||
      (a.section_id?.name?.toLowerCase().includes(q) ?? false)
    );
  });

  const columns: ColumnDef<PopulatedTeacherAssignment>[] = [
    {
      header: "Academic Year", accessorKey: "academic_year", render: (a) => (
        <span className="font-mono text-[12px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{a.academic_year}</span>
      )
    },
    {
      header: "Teacher", accessorKey: "teacher_id", render: (a) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center"><User className="w-3.5 h-3.5 text-emerald-500" /></div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{a.teacher_id?.name || "—"}</span>
        </div>
      )
    },
    {
      header: "Class", accessorKey: "class_id", render: (a) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500/10 rounded flex items-center justify-center"><GraduationCap className="w-3.5 h-3.5 text-blue-500" /></div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{a.class_id?.name || "—"}</span>
        </div>
      )
    },
    ...(enableStreams ? [{
      header: "Stream", accessorKey: "stream_id",
      render: (a: PopulatedTeacherAssignment) => a.stream_id ? (
        <span className="font-medium text-slate-700 dark:text-slate-300">{a.stream_id.name}</span>
      ) : <span className="text-slate-400 text-[13px] italic">—</span>,
    } as ColumnDef<PopulatedTeacherAssignment>] : []),
    ...(enableSections ? [{
      header: "Section", accessorKey: "section_id",
      render: (a: PopulatedTeacherAssignment) => a.section_id ? (
        <span className="font-medium text-slate-700 dark:text-slate-300">{a.section_id.name}</span>
      ) : <span className="text-slate-400 text-[13px] italic">—</span>,
    } as ColumnDef<PopulatedTeacherAssignment>] : []),
    {
      header: "Subject", accessorKey: "subject_master_id", render: (a) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center"><BookOpen className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /></div>
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{a.subject_master_id?.name || "—"}</span>
          </div>
        </div>
      )
    },
    ...(isAdmin ? [{
      header: "Action", sortable: false,
      render: (a: PopulatedTeacherAssignment) => (
        <button onClick={() => { setSelected(a); setIsDeleteOpen(true); }}
          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    } as ColumnDef<PopulatedTeacherAssignment>] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Teacher Assignment</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Academic Management</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Teacher Assignment</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={doFetch} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm">
            <RefreshCcw className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button onClick={() => { resetForm(); setIsAddOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] hover:bg-[#d68600] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors">
              <Plus className="w-4 h-4" /><span>Assign Teacher</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 card-shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Year</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
              <option value="">All Years</option>
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Teacher</label>
            <select value={filterTeacherId} onChange={(e) => setFilterTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Class</label>
            <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
            </select>
          </div>
          {enableStreams && (
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Stream</label>
              <select value={filterStreamId} onChange={(e) => setFilterStreamId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
                <option value="">All Streams</option>
                {streams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {enableSections && (
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Section</label>
              <select value={filterSectionId} onChange={(e) => setFilterSectionId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium">
                <option value="">All Sections</option>
                {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
            <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] outline-none w-full focus:border-[#10B981]/50 transition-colors bg-[#F8FAFC] dark:bg-[#0F172A]" />
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow">
        <div className="p-5 border-b border-border text-left">
          <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">
            Assigned Teachers {!isLoading && <span className="ml-2 text-[13px] font-normal text-slate-400">({filteredAssignments.length})</span>}
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
            <User className="w-10 h-10 opacity-30" />
            <p className="text-[14px] font-medium">No teacher assignments found</p>
            {isAdmin && (
              <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="mt-2 px-4 py-2 text-[13px] font-bold bg-[#1E3A5F] hover:bg-[#d68600] text-white rounded-lg">
                Assign First Teacher
              </button>
            )}
          </div>
        ) : (
          <DataTable columns={columns} data={filteredAssignments} />
        )}
      </div>

      {/* Add Assignment Modal */}
      <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); resetForm(); }} title="Assign Teacher">
        <form onSubmit={handleAdd} className="space-y-5 text-left">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Academic Year <span className="text-red-500">*</span></label>
              <select value={formYear} onChange={(e) => setFormYear(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Year</option>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Teacher <span className="text-red-500">*</span></label>
              <select value={formTeacherId} onChange={(e) => setFormTeacherId(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Class <span className="text-red-500">*</span></label>
              <select value={formClassId} onChange={(e) => setFormClassId(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ""}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Subject <span className="text-red-500">*</span></label>
              <select value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} required
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                <option value="">Select Subject</option>
                {filteredSubjectList.filter(s => s.status === "Active").map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            {enableStreams && filteredStreams.length > 0 && (
              <div className="flex flex-col gap-1.5" style={{ display: "none" }}>
                <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Stream</label>
                <select value={formStreamId} onChange={(e) => setFormStreamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">No Stream</option>
                  {filteredStreams.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {enableSections && (
              <div className="flex flex-col gap-1.5" style={{ display: "none" }}>
                <label className="text-[13px] font-semibold text-slate-900 dark:text-white font-medium">Section</label>
                <select value={formSectionId} onChange={(e) => setFormSectionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-[#10B981]/50 bg-white dark:bg-slate-900 font-medium shadow-sm">
                  <option value="">No Section</option>
                  {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button type="button" onClick={() => { setIsAddOpen(false); resetForm(); }}
              className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-[14px] font-bold rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#d68600] text-[14px] font-bold rounded-lg text-white shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Assign Teacher
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove Assignment">
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-slate-600 dark:text-slate-300">
            Remove teacher <span className="font-bold text-red-500">{selected?.teacher_id?.name}</span> from {" "}
            <span className="font-bold text-[#0F172A] dark:text-white">{selected?.class_id?.name} - {selected?.subject_master_id?.name}</span>?
            <br /><br />
            <span className="text-red-500 font-bold bg-red-50 p-2 rounded block">Warning: This will also delete any Syllabus created for this assignment!</span>
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteOpen(false)} className="px-5 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-[14px] font-bold rounded-lg">Cancel</button>
            <button onClick={handleDelete} disabled={submitting} className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-lg shadow-sm disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
