"use client";

import React from "react";
import { useStudentAuth } from "../../context/studentAuth";
import { useSubjects } from "../../../hooks/useSubjects";
import { BookOpen, Hash, User } from "lucide-react";

export default function StudentSubjectsPage() {
  const { studentProfile } = useStudentAuth();
  const { subjects, loading } = useSubjects();

  const classId =
    studentProfile?.class_id && typeof studentProfile.class_id === "object"
      ? studentProfile.class_id._id
      : (studentProfile?.class_id as string);

  const mySubjects = subjects.filter((sub: any) => {
    const subClassId = typeof sub.class_id === "object" ? sub.class_id?._id : sub.class_id;
    return subClassId === classId;
  });

  const colors = ["#6366f1", "#1E3A5F", "#10b981", "#f43f5e", "#8b5cf6", "#0ea5e9", "#ec4899", "#14b8a6"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Subjects</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
          Subjects assigned to your class
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[13px] text-slate-400">Loading subjects...</div>
      ) : mySubjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">No subjects found for your class</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mySubjects.map((sub: any, idx: number) => {
            const color = colors[idx % colors.length];
            const teacher = typeof sub.teacher_id === "object" ? sub.teacher_id?.name : null;

            return (
              <div
                key={sub._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                  >
                    {sub.name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{sub.name}</h3>
                    {sub.code && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <Hash className="w-3 h-3" /> {sub.code}
                      </span>
                    )}
                    {teacher && (
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                        <User className="w-3 h-3" /> {teacher}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
