"use client";

import { SchoolThemeProvider } from "./SchoolThemeProvider";

export function RootThemeProvider({ children }: { children: React.ReactNode }) {
  return <SchoolThemeProvider source="auto">{children}</SchoolThemeProvider>;
}
