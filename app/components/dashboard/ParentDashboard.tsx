"use client";

import React, { useMemo } from "react";
import { useParent } from "../../hooks/useParent";
import StudentDashboard from "./StudentDashboard";

export default function ParentDashboard() {
  const { children, selectedChildId, setSelectedChildId, isLoading: parentLoading } = useParent();

  const selectedChild = useMemo(() => {
    return children.find(c => c._id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

  const displayChildId = selectedChild?._id;
  const displayChildClassId = typeof selectedChild?.class_id === 'object' ? selectedChild?.class_id?._id : selectedChild?.class_id;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 to-purple-600 rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left shadow-lg mb-6">
        <div className="relative z-10">
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            Welcome to the Parent Portal
          </h2>
          <p className="text-[14px] text-purple-100 mt-2 max-w-lg">
            Track your child's academic progress, attendance, and fee status.
          </p>
        </div>

        {/* Child Selector */}
        <div className="relative z-10 mt-6 md:mt-0 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 min-w-[250px]">
          <p className="text-xs text-purple-200 mb-2 font-medium uppercase tracking-wider">Select Child:</p>
          {parentLoading ? (
            <div className="text-sm">Loading children...</div>
          ) : (
            <select
              className="w-full bg-white text-slate-900 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-900 dark:text-white"
              value={selectedChildId || ""}
              onChange={(e) => setSelectedChildId(e.target.value)}
            >
              {children.map(c => (
                <option key={c._id} value={c._id}>{c.name} {c.class_id ? `(${c.class_id?.name} ${c.class_id?.section})` : ""}</option>
              ))}
              {children.length === 0 && <option value="" disabled>No children found</option>}
            </select>
          )}
        </div>
      </div>

      {!selectedChild && !parentLoading ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">No Children Found</h3>
          <p className="text-slate-500 max-w-md mx-auto mt-2 dark:text-slate-400">
            We couldn't find any students linked to your account. Please contact the school administrator.
          </p>
        </div>
      ) : (
        selectedChild && (
          <StudentDashboard studentId={displayChildId} classId={displayChildClassId} />
        )
      )}
    </div>
  );
}
