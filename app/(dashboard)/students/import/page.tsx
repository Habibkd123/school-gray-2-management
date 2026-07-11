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

export default function StudentImportPage() {
  return (
    <BulkImport
      module="students"
      title="Bulk Import Students"
      sampleHeaders={sampleHeaders}
      sampleData={[]}
      validateUrl="/api/students/import/validate"
      importUrl="/api/students/import"
      backUrl="/students"
      templateUrl="/api/students/import/template"
    />
  );
}
