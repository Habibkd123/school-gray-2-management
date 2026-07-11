"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/utils/session";

export interface SyllabusResource {
  title: string;
  type: "file" | "youtube" | "drive" | "link";
  url: string;
}

export interface SyllabusAttachment {
  filename: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
}

export interface SyllabusNode {
  id: string;
  title: string;
  description?: string;
  type: "unit" | "chapter" | "topic" | "sub_topic" | "learning_outcome" | "resource" | "other";
  children?: SyllabusNode[];
  resources?: SyllabusResource[];
}

export interface SyllabusHistoryEntry {
  version: number;
  title: string;
  description?: string;
  status: "Draft" | "Published" | "Archived";
  nodes: SyllabusNode[];
  attachments: SyllabusAttachment[];
  reference_links: string[];
  updated_by?: any;
  updated_at: string;
  remarks?: string;
}

export interface SyllabusData {
  _id?: string;
  school_id?: string;
  academic_year: string;
  class_id: any; // populated or ID
  section_id?: any; // populated or ID
  stream_id?: any; // populated or ID
  subject_master_id: any; // populated or ID
  teacher_id?: any; // populated or ID
  
  title: string;
  description?: string;
  version: number;
  status: "Draft" | "Published" | "Archived";
  publish_date?: string | null;
  visibility: "Public" | "Internal" | "Restricted";
  
  attachments: SyllabusAttachment[];
  reference_links: string[];
  nodes: SyllabusNode[];
  
  history: SyllabusHistoryEntry[];
  created_by?: any;
  updated_by?: any;
  createdAt?: string;
  updatedAt?: string;
}

export function useSyllabus() {
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [syllabi, setSyllabi] = useState<SyllabusData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSyllabus = useCallback(async (params: string | {
    academic_year?: string;
    class_id?: string;
    section_id?: string;
    stream_id?: string;
    subject_master_id?: string;
    teacher_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    teacher_assignment_id?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = "/api/syllabus";
      if (typeof params === "string") {
        url = `/api/syllabus?teacher_assignment_id=${params}`;
      } else if (params) {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== "") {
            qs.set(key, String(val));
          }
        });
        url = `/api/syllabus?${qs.toString()}`;
      }

      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch syllabus data.");

      if (Array.isArray(data.data)) {
        setSyllabi(data.data);
        setTotal(data.total ?? data.data.length);
        setTotalPages(data.totalPages ?? 1);
        setCurrentPage(data.page ?? 1);
      } else if (data.data && data.data.syllabi) {
        setSyllabi(data.data.syllabi);
        setTotal(data.data.total ?? 0);
        setTotalPages(data.data.totalPages ?? 1);
        setCurrentPage(data.data.page ?? 1);
      } else {
        // Single Syllabus record returned
        setSyllabus(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSyllabusDetails = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/syllabus/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load syllabus details.");
      setSyllabus(data.data);
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabus details");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSyllabus = async (idOrData: string | Partial<SyllabusData>, rawChaptersFallback?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      // Legacy Mode Fallback: saveSyllabus(teacher_assignment_id, chapters)
      if (typeof idOrData === "string" && Array.isArray(rawChaptersFallback)) {
        const res = await fetch("/api/syllabus", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ teacher_assignment_id: idOrData, chapters: rawChaptersFallback }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to save syllabus");
        setSyllabus(data.data);
        return { success: true, message: "Syllabus saved successfully", data: data.data };
      }

      // New Standard Mode: saveSyllabus(data)
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(idOrData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save syllabus");
      setSyllabus(data.data);
      return { success: true, message: "Syllabus saved successfully", data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const updateSyllabus = async (id: string, updateData: Partial<SyllabusData> & { incrementVersion?: boolean; remarks?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to update syllabus");
      setSyllabus(data.data);
      return { success: true, message: "Syllabus updated successfully", data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSyllabus = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to delete syllabus");
      setSyllabus(null);
      setSyllabi(prev => prev.filter(s => s._id !== id));
      return { success: true, message: "Syllabus deleted successfully" };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateSyllabus = async (id: string, targetData: { academic_year: string; class_id: string; section_id?: string; stream_id?: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}?action=duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(targetData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to duplicate syllabus");
      return { success: true, message: "Syllabus duplicated successfully", data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  const restoreVersion = async (id: string, version: number, remarks?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/syllabus/${id}?action=restore`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ version, remarks }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to restore syllabus version");
      setSyllabus(data.data);
      return { success: true, message: `Restored to Version ${version} successfully`, data: data.data };
    } catch (err: any) {
      setError(err.message || "Network error");
      return { success: false, message: err.message || "Network error" };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syllabus,
    syllabi,
    isLoading,
    error,
    total,
    totalPages,
    currentPage,
    fetchSyllabus,
    getSyllabusDetails,
    saveSyllabus,
    updateSyllabus,
    deleteSyllabus,
    duplicateSyllabus,
    restoreVersion
  };
}
