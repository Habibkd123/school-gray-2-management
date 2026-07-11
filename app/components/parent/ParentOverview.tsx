"use client";

import React from "react";
import { useParent } from "@/app/hooks/useParent";
import { ChildSelector } from "./ChildSelector";
import Link from "next/link";
import { Clock, DollarSign, ClipboardList, BookOpen, ChevronRight, User } from "lucide-react";
import { HIDE_FEES_FEATURE } from "@/lib/permissions";

export function ParentOverview() {
  const { children, selectedChild, selectedChildId, setSelectedChildId, isLoading, error } = useParent();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 to-purple-600 rounded-xl text-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between text-left shadow-lg">
        <div className="relative z-10">
          <h2 className="section-title flex items-center gap-3">
            Welcome to the Parent Portal
            <span className="bg-white/10 p-1.5 rounded-lg border border-white/20">
              <User className="w-5 h-5 text-white" />
            </span>
          </h2>
          <p className="text-[14px] text-purple-100 mt-2 max-w-lg">
            Track your child's academic progress, attendance, and fee status all in one place.
          </p>
        </div>
        
        {/* Child Selector at the top of the dashboard */}
        <div className="relative z-10 mt-6 md:mt-0 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 min-w-full sm:w-[250px]">
          <p className="text-xs text-purple-200 mb-1 font-medium uppercase tracking-wider">Viewing data for:</p>
          <ChildSelector 
            childrenList={children} 
            selectedChildId={selectedChildId} 
            onSelectChild={setSelectedChildId} 
            isLoading={isLoading}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {selectedChild ? (() => {
        const SHOW_FEES = !HIDE_FEES_FEATURE;
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 ${SHOW_FEES ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-6`}>
            <QuickActionCard 
              title="Attendance"
              description="View daily and monthly attendance records"
              icon={<Clock className="w-6 h-6 text-emerald-500" />}
              href="/parent/attendance"
              color="bg-emerald-50 dark:bg-emerald-500/10"
            />
            {SHOW_FEES && (
              <QuickActionCard 
                title="Fee Status"
                description="Check pending dues and payment history"
                icon={<DollarSign className="w-6 h-6 text-amber-500" />}
                href="/parent/fees"
                color="bg-amber-50 dark:bg-amber-500/10"
              />
            )}
            <QuickActionCard 
              title="Exam Results"
              description="Download report cards and view grades"
              icon={<ClipboardList className="w-6 h-6 text-blue-500" />}
              href="/parent/results"
              color="bg-blue-50 dark:bg-blue-500/10"
            />
            <QuickActionCard 
              title="Homework"
              description="Track daily assignments and submissions"
              icon={<BookOpen className="w-6 h-6 text-purple-500" />}
              href="/parent/homework"
              color="bg-purple-50 dark:bg-purple-500/10"
            />
          </div>
        );
      })() : (
        !isLoading && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-border">
            <UsersPlaceholder />
            <h3 className="card-title mt-4">No Children Found</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2 dark:text-slate-400">
              We couldn't find any students linked to your email address. Please contact the school administrator to link your account to your children.
            </p>
          </div>
        )
      )}
    </div>
  );
}

function QuickActionCard({ title, description, icon, href, color }: any) {
  return (
    <Link href={href} className="group block bg-white dark:bg-slate-900 border border-border rounded-xl p-6 hover:shadow-md transition-all hover:border-primary/30">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <h3 className="card-title mb-2 flex items-center justify-between">
        {title}
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors group-hover:translate-x-1" />
      </h3>
      <p className="card-subtitle leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

function UsersPlaceholder() {
  return (
    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
      <User className="w-10 h-10" />
    </div>
  );
}
