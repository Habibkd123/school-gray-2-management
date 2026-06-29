"use client";

import React from "react";
import { Users, ChevronDown } from "lucide-react";
import { ApiChild } from "@/app/hooks/useParent";

interface ChildSelectorProps {
  childrenList: ApiChild[];
  selectedChildId: string | null;
  onSelectChild: (id: string) => void;
  isLoading?: boolean;
}

export function ChildSelector({ childrenList, selectedChildId, onSelectChild, isLoading }: ChildSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-sm text-sm">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-slate-500 dark:text-slate-400">Loading children...</span>
      </div>
    );
  }

  if (childrenList.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg shadow-sm text-sm">
        <Users className="w-4 h-4" />
        <span>No children linked to this account</span>
      </div>
    );
  }

  if (childrenList.length === 1) {
    const child = childrenList[0];
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-sm">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
          {child.name.charAt(0)}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
            {child.name}
          </span>
          {child.class_id && (
            <span className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
              Class {child.class_id?.name} {child.class_id?.section} {child.roll_no ? `| Roll: ${child.roll_no}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <select
        value={selectedChildId || ""}
        onChange={(e) => onSelectChild(e.target.value)}
        className="appearance-none w-full bg-white dark:bg-slate-900 border border-border text-slate-900 dark:text-white text-sm font-medium rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary block p-2.5 pr-10 shadow-sm cursor-pointer"
      >
        <option value="" disabled>Select Child</option>
        {childrenList.map((child) => (
          <option key={child._id} value={child._id}>
            {child.name} {child.class_id ? `(${child.class_id?.name} ${child.class_id?.section})` : ''}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
}
