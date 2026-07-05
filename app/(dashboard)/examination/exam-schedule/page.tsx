"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus, Search, Edit, Trash2, Calendar, ChevronDown, RefreshCw, Printer, Loader2, ArrowLeft
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useExams } from "../../../hooks/useExams";
import { useExamSchedule, ApiExamSchedule } from "../../../hooks/useExamSchedule";
import { useSubjects } from "../../../hooks/useSubjects";

export default function ExamSchedulePage() {
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get("exam_id") || "";

  const { exams, loading: examsLoading } = useExams();
  const [selectedExamId, setSelectedExamId] = useState(examIdParam);

  // Sync selected exam from URL query parameter
  useEffect(() => {
    if (examIdParam) setSelectedExamId(examIdParam);
  }, [examIdParam]);

  // Find selected exam object
  const selectedExam = useMemo(() => {
    return exams.find(e => e._id === selectedExamId);
  }, [exams, selectedExamId]);

  // Extract selected class ID
  const selectedClassId = useMemo(() => {
    if (!selectedExam) return "";
    return typeof selectedExam.class_id === "object" ? selectedExam.class_id?._id : selectedExam.class_id || "";
  }, [selectedExam]);

  // Fetch subjects of selected class
  const { subjects, loading: subjectsLoading } = useSubjects(selectedClassId || undefined);

  // Fetch schedules for selected exam
  const { schedules, loading: schedulesLoading, createSchedule, updateSchedule, deleteSchedule, fetchSchedules } = useExamSchedule(selectedExamId || undefined);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedSchedule, setSelectedSchedule] = useState<ApiExamSchedule | null>(null);

  // Form states
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:30 AM");
  const [formEndTime, setFormEndTime] = useState("12:30 PM");
  const [formMaxMarks, setFormMaxMarks] = useState("100");
  const [formPassingMarks, setFormPassingMarks] = useState("33");
  const [formRoom, setFormRoom] = useState("");

  // Update default marks when subject selection changes in Add modal
  useEffect(() => {
    if (formSubjectId) {
      const sub = subjects.find(s => s._id === formSubjectId);
      if (sub) {
        setFormMaxMarks(sub.full_marks?.toString() || "100");
        setFormPassingMarks(sub.pass_marks?.toString() || "33");
      }
    }
  }, [formSubjectId, subjects]);

  const openAddModal = () => {
    setFormSubjectId("");
    setFormDate("");
    setFormStartTime("09:30 AM");
    setFormEndTime("12:30 PM");
    setFormMaxMarks("100");
    setFormPassingMarks("33");
    setFormRoom("");
    setIsAddOpen(true);
  };

  const openEditModal = (item: ApiExamSchedule) => {
    setSelectedSchedule(item);
    setFormSubjectId(typeof item.subject_id === "object" ? item.subject_id?._id : item.subject_id || "");
    setFormDate(item.date ? new Date(item.date).toISOString().slice(0, 10) : "");
    setFormStartTime(item.start_time || "");
    setFormEndTime(item.end_time || "");
    setFormMaxMarks(item.max_marks?.toString() || "100");
    setFormPassingMarks(item.passing_marks?.toString() || "33");
    setFormRoom(item.room || "");
    setIsEditOpen(true);
  };

  const openDeleteModal = (item: ApiExamSchedule) => {
    setSelectedSchedule(item);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !formSubjectId || !formDate || !formStartTime || !formEndTime) return;

    // Check duplicate client-side (exam_id, subject_id, date)
    const isDuplicate = schedules.some(s => {
      const sSubId = typeof s.subject_id === "object" ? s.subject_id?._id : s.subject_id;
      const sDateStr = new Date(s.date).toISOString().slice(0, 10);
      const newDateStr = new Date(formDate).toISOString().slice(0, 10);
      return sSubId === formSubjectId && sDateStr === newDateStr;
    });

    if (isDuplicate) {
      alert("A schedule for this subject and date already exists for this exam.");
      return;
    }

    setSaving(true);
    const res = await createSchedule({
      exam_id: selectedExamId,
      subject_id: formSubjectId,
      date: formDate,
      start_time: formStartTime,
      end_time: formEndTime,
      max_marks: Number(formMaxMarks),
      passing_marks: Number(formPassingMarks),
      room: formRoom || undefined
    });
    setSaving(false);

    if (res.success) {
      setIsAddOpen(false);
    } else {
      alert(res.message || "Failed to create schedule.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !formDate || !formStartTime || !formEndTime) return;

    setSaving(true);
    const res = await updateSchedule(selectedSchedule._id, {
      date: formDate,
      start_time: formStartTime,
      end_time: formEndTime,
      max_marks: Number(formMaxMarks),
      passing_marks: Number(formPassingMarks),
      room: formRoom || undefined
    });
    setSaving(false);

    if (res.success) {
      setIsEditOpen(false);
    } else {
      alert(res.message || "Failed to update schedule.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchedule) return;
    const res = await deleteSchedule(selectedSchedule._id);
    if (res.success) {
      setIsDeleteOpen(false);
    } else {
      alert(res.message || "Failed to delete schedule.");
    }
  };

  const formatDateLabel = (d: string | Date) => {
    try {
      return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return String(d);
    }
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/examination/exam" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 mr-1">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Exam Schedule</h1>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1 pl-8">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/examination/exam" className="hover:text-primary">Exam</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Exam Schedule</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchSchedules()} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          {selectedExamId && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          )}
        </div>
      </div>

      {/* Select Exam Dropdown */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-5 text-left">
        <div className="max-w-md space-y-1.5">
          <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Select Exam</label>
          <div className="relative">
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="">Choose an Exam to schedule...</option>
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.name} {typeof ex.class_id === "object" ? `(${ex.class_id?.name || ""} - ${ex.class_id?.section || ""})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">
            {selectedExam ? `Schedule for: ${selectedExam.name}` : "Exam Schedule details"}
          </h2>
          {selectedExam && (
            <span className="text-[12px] font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded border border-border">
              Class: {typeof selectedExam.class_id === "object" ? `${selectedExam.class_id?.name} - ${selectedExam.class_id?.section}` : "—"}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Subject</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Exam Date</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Start Time</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">End Time</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Max Marks</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Passing Marks</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Room</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!selectedExamId ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    Please select an exam from the dropdown above to manage its subject schedule.
                  </td>
                </tr>
              ) : (schedulesLoading || examsLoading) ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-slate-500 mt-2">Loading schedules...</p>
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                    No subjects scheduled for this exam yet. Click &quot;Add Subject&quot; to begin.
                  </td>
                </tr>
              ) : schedules.map((item) => {
                const subName = typeof item.subject_id === "object" ? item.subject_id?.name : item.subject_id;
                const subCode = typeof item.subject_id === "object" ? item.subject_id?.code : "";
                return (
                  <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                      {subName} {subCode ? `(${subCode})` : ""}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {formatDateLabel(item.date)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.start_time}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.end_time}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">{item.max_marks}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">{item.passing_marks}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.room || "—"}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(item)}
                        className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-450 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Schedule Modal */}
      <Modal isOpen={isAddOpen} size="lg" onClose={() => setIsAddOpen(false)} title="Add Subject Schedule">
        <form onSubmit={handleAddSubmit} className="p-6 space-y-5 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Subject</label>
            <div className="relative">
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                required
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-750 dark:text-slate-200 cursor-pointer"
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>{sub.name} {sub.code ? `(${sub.code})` : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Start Time</label>
              <TimePicker value={formStartTime} onChange={setFormStartTime} />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Time</label>
              <TimePicker value={formEndTime} onChange={setFormEndTime} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Maximum Marks</label>
              <input
                type="number"
                value={formMaxMarks}
                onChange={(e) => setFormMaxMarks(e.target.value)}
                required
                min={1}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Passing Marks</label>
              <input
                type="number"
                value={formPassingMarks}
                onChange={(e) => setFormPassingMarks(e.target.value)}
                required
                min={0}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Room (Optional)</label>
            <input
              type="text"
              value={formRoom}
              onChange={(e) => setFormRoom(e.target.value)}
              placeholder="e.g. Room 102"
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Schedule Modal */}
      <Modal isOpen={isEditOpen} size="lg" onClose={() => setIsEditOpen(false)} title="Edit Subject Schedule">
        <form onSubmit={handleEditSubmit} className="p-6 space-y-5 text-left max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Subject</label>
            <input
              type="text"
              value={selectedSchedule && typeof selectedSchedule.subject_id === "object" ? selectedSchedule.subject_id.name : ""}
              disabled
              className="w-full px-4 py-2.5 text-[14px] bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-slate-500 cursor-not-allowed outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Exam Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Start Time</label>
              <TimePicker value={formStartTime} onChange={setFormStartTime} />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">End Time</label>
              <TimePicker value={formEndTime} onChange={setFormEndTime} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Maximum Marks</label>
              <input
                type="number"
                value={formMaxMarks}
                onChange={(e) => setFormMaxMarks(e.target.value)}
                required
                min={1}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Passing Marks</label>
              <input
                type="number"
                value={formPassingMarks}
                onChange={(e) => setFormPassingMarks(e.target.value)}
                required
                min={0}
                className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Room (Optional)</label>
            <input
              type="text"
              value={formRoom}
              onChange={(e) => setFormRoom(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
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
            <h2 className="text-xl font-bold text-foreground dark:text-slate-100 mb-3">Delete Subject Schedule</h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              Are you sure you want to delete the schedule for this subject?
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
                className="px-6 py-2.5 bg-rose-500 text-white text-[14px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
}

function TimePicker({ value, onChange }: TimePickerProps) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let currentHour = "09";
  let currentMinute = "00";
  let currentPeriod = "AM";
  if (match) {
    let [, h, m, p] = match;
    if (h.length === 1) h = `0${h}`;
    currentHour = h;
    currentMinute = m;
    currentPeriod = p.toUpperCase();
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  const periods = ["AM", "PM"];

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${currentMinute} ${currentPeriod}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${currentHour}:${newMinute} ${currentPeriod}`);
  };

  const handlePeriodChange = (newPeriod: string) => {
    onChange(`${currentHour}:${currentMinute} ${newPeriod}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <select
          value={currentHour}
          onChange={(e) => handleHourChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <span className="text-slate-400 font-bold">:</span>

      <div className="relative flex-1">
        <select
          value={currentMinute}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="w-full pl-3 pr-8 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 font-mono cursor-pointer"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div className="relative w-[75px]">
        <select
          value={currentPeriod}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="w-full pl-3 pr-7 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary appearance-none text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
        >
          {periods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
