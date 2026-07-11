"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStudentAuth } from "../context/studentAuth";
import { HIDE_FEES_FEATURE } from "@/lib/permissions";
import { StudentSidebar } from "../components/StudentSidebar";
import { StudentHeader } from "../components/StudentHeader";
import { Loader2 } from "lucide-react";

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useStudentAuth();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
      return;
    }
    if (HIDE_FEES_FEATURE && !isLoading && isAuthenticated && pathname.startsWith("/student/fees")) {
      router.replace("/student/dashboard");
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="card-subtitle text-[13px]">
            Loading Student Portal...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      <StudentSidebar
        isMobileOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <StudentHeader onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
          <div className="w-full max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
