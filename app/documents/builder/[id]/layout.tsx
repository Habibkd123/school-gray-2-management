import type { Metadata } from "next";
import "../../../globals.css";

export const metadata: Metadata = {
  title: "Document Builder — MySchoolLife",
  description: "Visual document editor",
};

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
