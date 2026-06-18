"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { StudentAuthProvider } from "./context/studentAuth";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <StudentAuthProvider>{children}</StudentAuthProvider>
    </ThemeProvider>
  );
}
