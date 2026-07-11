"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Loader2, Save, CheckSquare, Square } from "lucide-react";
import { useFeeGroups, useFeeAllocations } from "@/app/hooks/useFees";
import { useClasses } from "@/app/hooks/useClasses";
import { useStudents } from "@/app/hooks/useStudents";

export default function AssignFeesPage() {
  const { groups, loading: groupsLoading } = useFeeGroups();
  const { classes, isLoading: classesLoading } = useClasses();
  const { students, isLoading: studentsLoading, fetchStudents } = useStudents({ skip: true });
  const { allocations, loading: allocLoading, allocateFees, fetchAllocations } = useFeeAllocations();

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Helper to check DB allocations
  const isAssigned = (studentId: string, groupId: string) => {
    return allocations.some(a => {
      const sId = a.student_id && typeof a.student_id === "object" ? a.student_id._id : a.student_id;
      const gId = a.fee_group_id && typeof a.fee_group_id === "object" ? a.fee_group_id._id : a.fee_group_id;
      return sId === studentId && gId === groupId;
    });
  };

  // Sync selectedStudents state on group, class, or allocations change
  React.useEffect(() => {
    if (selectedClass && selectedGroup && students.length > 0) {
      const assignedIds = students
        .filter(s => isAssigned(s._id, selectedGroup))
        .map(s => s._id);
      setSelectedStudents(assignedIds);
    } else {
      setSelectedStudents([]);
    }
  }, [selectedClass, selectedGroup, students, allocations]);

  const handleClassChange = async (classId: string) => {
    setSelectedClass(classId);
    if (classId) {
      await fetchStudents(undefined, classId);
      await fetchAllocations(); // Refresh all allocations
    }
  };

  const toggleStudent = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(s => s !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const toggleAll = () => {
    if (!selectedGroup) return;
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s._id));
    }
  };

  const handleSave = async () => {
    if (!selectedGroup) return;
    setSaving(true);

    const initialAssignedIds = students
      .filter(s => isAssigned(s._id, selectedGroup))
      .map(s => s._id);

    const toAssign = selectedStudents.filter(id => !initialAssignedIds.includes(id));
    const toUnassign = initialAssignedIds.filter(id => !selectedStudents.includes(id));

    await allocateFees({ 
      fee_group_id: selectedGroup, 
      student_ids: toAssign,
      unassign_student_ids: toUnassign
    });
    
    await fetchAllocations(); // Refresh
    setSaving(false);
  };

  const loading = groupsLoading || classesLoading || studentsLoading || allocLoading;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Assign Fees</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/fees-collection" className="hover:text-primary">Fees Collection</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Assign Fees</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Select Fee Group <span className="text-rose-500">*</span></label>
            <select 
              value={selectedGroup} 
              onChange={e => { setSelectedGroup(e.target.value); }}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select...</option>
              {groups.map(g => (
                <option key={g._id} value={g._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Select Class <span className="text-rose-500">*</span></label>
            <select 
              value={selectedClass} 
              onChange={e => handleClassChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary transition-colors"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Select...</option>
              {classes.map(c => (
                <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name} {c.section ? `— ${c.section}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedClass && selectedGroup && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
              <span>Showing students for selected class</span>
            </div>
            
            <button 
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              Save Assignments
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-12 cursor-pointer" onClick={toggleAll}>
                    {students.length > 0 && selectedStudents.length === students.length ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Admission No</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Roll No</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">No students found in this class.</td>
                  </tr>
                ) : students.map((s) => {
                  const dbAssigned = isAssigned(s._id, selectedGroup);
                  const selected = selectedStudents.includes(s._id);
                  
                  // badge color and label helper
                  let statusLabel = "Not Assigned";
                  let badgeClass = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                  
                  if (dbAssigned) {
                    if (selected) {
                      statusLabel = "Assigned";
                      badgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
                    } else {
                      statusLabel = "Pending Deallocation";
                      badgeClass = "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
                    }
                  } else {
                    if (selected) {
                      statusLabel = "Pending Assignment";
                      badgeClass = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
                    }
                  }

                  return (
                    <tr key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="cursor-pointer" onClick={() => toggleStudent(s._id)}>
                          {selected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.admission_no}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{s.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{s.roll_no || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[11px] font-semibold rounded ${badgeClass}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
