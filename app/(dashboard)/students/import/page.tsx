"use client";

import React from "react";
import BulkImport from "@/app/components/BulkImport";

const sampleHeaders = [
  "Admission No*",
  "Roll No",
  "Student Name*",
  "Class*",
  "Section*",
  "Gender",
  "DOB",
  "Primary Phone",
  "Email",
  "Address",
  "Guardian Name*",
  "Guardian Phone*",
  "Guardian Email",
  "Guardian Relation*",
  "Academic Year*",
  "Aadhaar No",
];

const sampleData = [
  [
    "ADM001", "1", "Aarav Sharma", "Class 10", "A", "Male", "2010-05-15",
    "9876543210", "aarav@example.com", "123 Main St, Springfield", "Rajesh Sharma",
    "9876543211", "rajesh.sharma@example.com", "Father", "2026-2027", "123456789012"
  ],
  [
    "ADM002", "2", "Ananya Patel", "Class 10", "A", "Female", "2010-08-22",
    "9876543220", "ananya@example.com", "456 Oak Rd, Springfield", "Suresh Patel",
    "9876543221", "suresh.patel@example.com", "Father", "2026-2027", "123456789013"
  ]
];

export default function StudentImportPage() {
  return (
    <BulkImport
      module="students"
      title="Bulk Import Students"
      sampleHeaders={sampleHeaders}
      sampleData={sampleData}
      validateUrl="/api/students/import/validate"
      importUrl="/api/students/import"
      backUrl="/students"
      templateUrl="/api/students/import/template"
    />
  );
}
