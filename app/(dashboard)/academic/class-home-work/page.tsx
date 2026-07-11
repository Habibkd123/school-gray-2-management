"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils/session";
import {
  Plus, Search, List, Grid, MoreVertical, Edit, Trash2,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, Trash, FileText, ToggleRight, Loader2,
  Eye, CheckCircle2, Upload, Link2, MessageSquare
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useHomework, ApiHomework } from "../../../hooks/useHomework";
import { useClasses } from "../../../hooks/useClasses";
import { useSubjects } from "../../../hooks/useSubjects";
import { useStudents } from "../../../hooks/useStudents";
import { useUpload } from "../../../hooks/useUpload";

function cleanAttachmentUrl(url?: string): string {
  if (!url) return "";
  const match = url.match(/https?:\/\/res\.cloudinary\.com\/.*/);
  if (match) {
    return match[0];
  }
  return url;
}

export default function ClassHomeWorkPage() {
  const { homework, isLoading, createHomework, deleteHomework, fetchHomework, submitHomework, gradeHomework, markCompleted, publishHomework } = useHomework();
  const { uploading, uploadFile } = useUpload();
  const { classes } = useClasses();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("06/02/2026 - 06/08/2026");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [selectedHw, setSelectedHw] = useState<ApiHomework | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Add Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formSyllabusId, setFormSyllabusId] = useState("");
  const [formChapterId, setFormChapterId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");
  const [formStatus, setFormStatus] = useState("published");
  const [submitting, setSubmitting] = useState(false);

  // Syllabus/chapter cascade state
  const [syllabusChapters, setSyllabusChapters] = useState<{ _id?: string; chapter_no: number; chapter_name: string }[]>([]);
  const [syllabusLoading, setSyllabusLoading] = useState(false);

  // Submit Homework States (Student)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitContent, setSubmitContent] = useState("");

  // View Submissions States (Teacher)
  const [viewSubmissionsHw, setViewSubmissionsHw] = useState<ApiHomework | null>(null);
  const [gradingState, setGradingState] = useState<{ [key: string]: { grade: string, feedback?: string, remarks?: string } }>({});

  // Fetch subjects dynamically based on selected class in the form
  const { subjects: allSubjects } = useSubjects();
  const { subjects: availableSubjects } = useSubjects(formClassId);

  // When class changes, reset subject + syllabus cascade
  React.useEffect(() => {
    setFormSubject("");
    setFormChapterId("");
    setSyllabusChapters([]);
  }, [formClassId]);

  // When subject changes, reset chapter and fetch syllabus
  React.useEffect(() => {
    setFormChapterId("");
    setSyllabusChapters([]);
    if (!formClassId || !formSubject) return;

    setSyllabusLoading(true);
    fetch(`/api/syllabus-by-class?class_id=${formClassId}&subject_name=${encodeURIComponent(formSubject)}`, {
      headers: getAuthHeaders(),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.chapters?.length) {
          setSyllabusChapters(data.data.chapters);
        } else {
          setSyllabusChapters([]);
        }
      })
      .catch(() => setSyllabusChapters([]))
      .finally(() => setSyllabusLoading(false));
  }, [formClassId, formSubject]);

  // When chapter changes, auto-fill title from chapter name
  React.useEffect(() => {
    if (!formChapterId) return;
    const chapter = syllabusChapters.find(c => (c._id || String(c.chapter_no)) === formChapterId);
    if (chapter) {
      setFormTitle(`Ch ${chapter.chapter_no}: ${chapter.chapter_name} - Homework`);
    }
  }, [formChapterId, syllabusChapters]);

  const viewClassId = viewSubmissionsHw ? (typeof viewSubmissionsHw.class_id === 'object' ? viewSubmissionsHw.class_id?._id : viewSubmissionsHw.class_id) as string : undefined;
  const { students, fetchStudents } = useStudents({ skip: true });

  // When viewSubmissionsHw changes, fetch students for that class
  React.useEffect(() => {
    if (viewClassId) fetchStudents(undefined, viewClassId);
  }, [viewClassId, fetchStudents]);

  const getClassName = (classId: any) => {
    if (!classId) return "—";
    if (typeof classId === "object") return `${classId.name} - ${classId.section}`;
    const c = classes.find(x => x._id === classId);
    return c ? `${c.name} - ${c.section}` : "—";
  };

  const getSubjectName = (subjectId: any) => {
    if (!subjectId) return "—";
    let actualId = "";
    if (typeof subjectId === "object" && subjectId !== null) {
      const name = subjectId.name || "";
      if (/^[0-9a-fA-F]{24}$/.test(name)) {
        actualId = name;
      } else {
        return name || "—";
      }
    } else {
      actualId = subjectId;
    }

    if (actualId) {
      const found = allSubjects.find(s => s._id === actualId);
      if (found) return found.name;
    }
    return typeof subjectId === "object" ? subjectId.name || "—" : subjectId;
  };

  const getTeacherName = (teacherId: any) => {
    if (!teacherId) return "—";
    if (typeof teacherId === "object") return teacherId.name;
    return teacherId;
  };

  const openAddModal = () => {
    setFormTitle("");
    setFormDescription("");
    setFormClassId("");
    setFormSubject("");
    setFormChapterId("");
    setSyllabusChapters([]);
    setFormDueDate("");
    setFormAttachmentUrl("");
    setFormStatus("published");
    setIsAddOpen(true);
  };

  const openDeleteModal = (item: ApiHomework) => {
    setSelectedHw(item);
    setIsDeleteOpen(true);
    setActionMenuId(null);
  };

  const openSubmitModal = (item: ApiHomework) => {
    setSelectedHw(item);
    setSubmitContent("");
    setIsSubmitOpen(true);
    setActionMenuId(null);
  };

  const openViewSubmissionsModal = (item: ApiHomework) => {
    setViewSubmissionsHw(item);
    setGradingState({});
    setActionMenuId(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await createHomework({
      title: formTitle,
      description: formDescription,
      classId: formClassId,
      subject: formSubject,
      dueDate: formDueDate,
      attachmentUrl: formAttachmentUrl,
      status: formStatus,
    });
    setSubmitting(false);
    setIsAddOpen(false);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHw) return;
    setSubmitting(true);
    // Hardcoded student ID for demo since auth isn't fully integrated into frontend context yet
    const demoStudentId = "65f0a1b2c3d4e5f6a7b8c9d1";
    await submitHomework(selectedHw._id, demoStudentId, submitContent);
    setSubmitting(false);
    setIsSubmitOpen(false);
  };

  const handleGradeSubmit = async (studentId: string) => {
    if (!viewSubmissionsHw) return;
    const { grade, remarks } = gradingState[studentId] || {};
    if (!grade) return;

    setSubmitting(true);
    const res = await gradeHomework(viewSubmissionsHw._id, studentId, grade, undefined, remarks);
    if (res.success) {
      setViewSubmissionsHw((prev) => {
        if (!prev) return null;
        const newSubmissions = prev.submissions.map((sub) => {
          const subId = typeof sub.student_id === "object" ? sub.student_id._id : sub.student_id;
          if (subId === studentId) {
            return { ...sub, grade, remarks };
          }
          return sub;
        });
        return { ...prev, submissions: newSubmissions };
      });
    }
    setSubmitting(false);
  };

  const handleDeleteConfirm = async () => {
    if (selectedHw) {
      setSubmitting(true);
      await deleteHomework(selectedHw._id);
      setSubmitting(false);
    }
    setIsDeleteOpen(false);
  };

  const filteredData = useMemo(() => {
    return homework.filter(s => {
      const titleMatch = s.title.toLowerCase().includes(searchTerm.toLowerCase());
      const subjectMatch = getSubjectName(s.subject_id).toLowerCase().includes(searchTerm.toLowerCase());
      const classMatch = filterClass ? (typeof s.class_id === "object" ? s.class_id?._id : s.class_id) === filterClass : true;
      return (titleMatch || subjectMatch) && classMatch;
    });
  }, [homework, searchTerm, filterClass]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Class Home Work</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/academic" className="hover:text-primary">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Home Work</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchHomework()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Homework
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">Home Work List</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer outline-none appearance-none pr-8">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" /> {selectedDateRange}
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute right-0 sm:left-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year", "Next Year", "Custom Range"].map((item) => (
                      <button key={item} onClick={() => { setSelectedDateRange(item); setIsDateRangeOpen(false); }} className={`w-full px-4 py-2 text-[13px] text-left transition-colors cursor-pointer ${item === selectedDateRange ? "bg-primary text-white font-semibold" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="card-subtitle flex items-center gap-2 text-[13px]">
            <span>Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredData.length}</span> items</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search homework..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className={`overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Title</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Class</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Subject</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Submission Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Progress</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Attachment</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200 w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No homework found.
                  </td>
                </tr>
              ) : filteredData.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">{item.title}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                    {getClassName(item.class_id)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{getSubjectName(item.subject_id)}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{new Date(item.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {item.status === "draft" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        Draft
                      </span>
                    ) : item.status === "completed" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-800/30 dark:text-emerald-400">
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-400">
                        Published
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {item.submissions?.length || 0} Submitted
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.attachment_url ? (
                      <a href={cleanAttachmentUrl(item.attachment_url)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline text-[13px] font-medium" onClick={e => e.stopPropagation()}>
                        <Link2 className="w-4 h-4" /> Link
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActionMenuId(actionMenuId === item._id ? null : item._id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === item._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuId === item._id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                        <div className="absolute right-10 top-10 w-44 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                          {item.status === "draft" && (
                            <button
                              onClick={async () => {
                                await publishHomework(item._id);
                                setActionMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-blue-500" /> Publish Task
                            </button>
                          )}
                          {item.status === "published" && (
                            <button
                              onClick={async () => {
                                await markCompleted(item._id);
                                setActionMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mark Completed
                            </button>
                          )}
                          <button onClick={() => openSubmitModal(item)} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                            <Upload className="w-4 h-4 text-emerald-500" /> Submit Work
                          </button>
                          <button onClick={() => openViewSubmissionsModal(item)} className="w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                            <Eye className="w-4 h-4 text-indigo-500" /> View Progress
                          </button>
                          <button onClick={() => openDeleteModal(item)} className="w-full px-4 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 font-medium transition-colors cursor-pointer border-t border-border mt-1 pt-3">
                            <Trash2 className="w-4 h-4 text-rose-600" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Homework">
        <form onSubmit={handleAddSubmit} className="p-6 space-y-5 text-left max-h-[95vh] overflow-y-auto custom-scrollbar">

          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Class</label>
            <div className="relative">
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Subject — filtered by class */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Subject</label>
            <div className="relative">
              <select
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                required
                disabled={!formClassId || availableSubjects.length === 0}
              >
                <option value="">Select Subject</option>
                {availableSubjects.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {formClassId && availableSubjects.length === 0 && (
              <p className="text-[12px] text-slate-400 italic">No subjects available for this class.</p>
            )}
          </div>

          {/* Syllabus / Chapter */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
              Chapter
              {syllabusLoading && <span className="ml-2 text-[11px] text-slate-400 font-normal italic">Loading...</span>}
            </label>
            <div className="relative">
              {syllabusChapters.length > 0 ? (
                <select
                  value={formChapterId}
                  onChange={(e) => setFormChapterId(e.target.value)}
                  className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Select Chapter (optional)</option>
                  {syllabusChapters.map(ch => (
                    <option key={ch._id || ch.chapter_no} value={ch._id || String(ch.chapter_no)}>
                      Ch {ch.chapter_no}: {ch.chapter_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="card-subtitle w-full px-4 py-2.5 text-[13px] bg-slate-50 dark:bg-slate-800/50 border border-border rounded-lg text-slate-400 dark: italic">
                  {!formSubject
                    ? "Select a subject to load chapters"
                    : syllabusLoading
                      ? "Loading chapters..."
                      : "No syllabus found for this subject"}
                </div>
              )}
              {syllabusChapters.length > 0 && (
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
          </div>

          {/* Title — auto-filled from chapter, but editable */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
              Title
              {formChapterId && <span className="ml-1.5 text-[11px] text-emerald-500 font-normal">(auto-filled from chapter)</span>}
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              required
              placeholder="e.g. Chapter 1 Exercise"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Due Date</label>
            <input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
              required
            />
          </div>

          {/* Attachment */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Attachment (Optional)</label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Upload file or enter URL..."
                value={formAttachmentUrl}
                onChange={(e) => setFormAttachmentUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              />
              <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-sm border border-border flex-shrink-0">
                <Upload className="w-4 h-4 text-primary" />
                <span>{uploading ? "Uploading..." : "Upload File"}</span>
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadFile(file);
                      if (url) {
                        setFormAttachmentUrl(url.startsWith("http") ? url : window.location.origin + url);
                      }
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Status</label>
            <div className="relative">
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
                required
              >
                <option value="published">Publish Now</option>
                <option value="draft">Save as Draft</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Description</label>
            <textarea
              rows={3}
              placeholder="Optional description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Homework"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-slate-100 mb-3">Confirm Deletion</h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              Are you sure you want to delete homework <strong>{selectedHw?.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-6 py-2.5 bg-rose-500 text-white text-[14px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Submit Homework Modal */}
      <Modal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} title="Submit Assignment">
        <form onSubmit={handleStudentSubmit} className="p-6 space-y-5 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Submission Details / URL</label>
            <textarea
              rows={4}
              placeholder="Provide your text answer or paste a link to your assignment file..."
              value={submitContent}
              onChange={(e) => setSubmitContent(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200 resize-none"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Attach Document (PDF, Image, etc.)</label>
            <label className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-dashed border-border rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm text-[13px] font-medium text-slate-600 dark:text-slate-300">
              <Upload className="w-4 h-4 text-primary" />
              <span>{uploading ? "Uploading..." : "Upload File"}</span>
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = await uploadFile(file);
                    if (url) {
                      const finalUrl = url.startsWith("http") ? url : window.location.origin + url;
                      setSubmitContent(prev => prev ? `${prev}\nAttachment: ${finalUrl}` : `Attachment: ${finalUrl}`);
                    }
                  }
                }}
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsSubmitOpen(false)}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !submitContent}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Submissions & Grade Modal */}
      <Modal size="xl" isOpen={!!viewSubmissionsHw} onClose={() => setViewSubmissionsHw(null)} title="Student Progress & Grading">
        <div className="p-0 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
          {viewSubmissionsHw && viewSubmissionsHw.status !== "completed" && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-border flex justify-between items-center">
              <span className="text-[12px] font-semibold text-amber-500 dark:text-slate-400">Homework is currently active</span>
              <button
                onClick={async () => {
                  const res = await markCompleted(viewSubmissionsHw._id);
                  if (res.success) {
                    setViewSubmissionsHw(prev => prev ? { ...prev, status: "completed" } : null);
                  }
                }}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-sm text-xs font-bold transition-colors cursor-pointer"
              >
                Mark Homework Completed
              </button>
            </div>
          )}

          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                <th className="px-6 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Content / Link</th>
                <th className="px-6 py-3 text-left font-bold text-slate-700 dark:text-slate-200">Grade & Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No students found in this class.
                  </td>
                </tr>
              ) : students.map((student) => {
                const submission = viewSubmissionsHw?.submissions?.find(
                  (s) => (typeof s.student_id === "object" ? s.student_id._id : s.student_id) === student._id
                );
                return (
                  <tr key={student._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                      {student.name} <span className="text-slate-400 block text-[11px] font-normal">Roll: {student.roll_no || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {submission ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Submitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[11px] dark:text-slate-400">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {submission ? (
                        submission.content.startsWith("http") ? (
                          <a href={submission.content} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <Link2 className="w-3 h-3" /> Open Link
                          </a>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300 truncate max-w-full sm:w-[150px] inline-block" title={submission.content}>
                            {submission.content}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {submission ? (
                        submission.grade ? (
                          <div className="text-slate-700 dark:text-slate-200 font-bold">
                            <div>Grade: {submission.grade}</div>
                            {(submission.remarks || submission.feedback) && (
                              <span className="block text-slate-500 font-normal text-[11px] truncate max-w-full sm:w-[180px] dark:text-slate-400">
                                Remarks: {submission.remarks || submission.feedback}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 w-44">
                            <input
                              type="text"
                              placeholder="Grade (e.g. A+)"
                              className="px-2 py-1 text-[12px] bg-white dark:bg-slate-900 border border-border rounded outline-none focus:border-primary w-full"
                              value={gradingState[student._id]?.grade || ""}
                              onChange={(e) => setGradingState(prev => ({ ...prev, [student._id]: { ...prev[student._id], grade: e.target.value } }))}
                            />
                            <input
                              type="text"
                              placeholder="Remarks (optional)"
                              className="px-2 py-1 text-[12px] bg-white dark:bg-slate-900 border border-border rounded outline-none focus:border-primary w-full"
                              value={gradingState[student._id]?.remarks || ""}
                              onChange={(e) => setGradingState(prev => ({ ...prev, [student._id]: { ...prev[student._id], remarks: e.target.value } }))}
                            />
                            <button
                              onClick={() => handleGradeSubmit(student._id)}
                              disabled={submitting}
                              className="px-3 py-1 bg-primary text-white rounded text-[11px] font-bold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer disabled:opacity-50 w-full"
                            >
                              Submit Evaluation
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 border-t border-border flex justify-end">
            <button
              onClick={() => setViewSubmissionsHw(null)}
              className="px-6 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
