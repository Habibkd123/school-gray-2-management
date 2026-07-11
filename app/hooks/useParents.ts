import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { IParent } from "@/lib/models/Parent";
import { IStudent } from "@/lib/models/Student";
import { useAppState } from "@/app/context/store";

export type ApiParent = Omit<IParent, "school_id" | "user_id"> & {
  _id: string;
  children: (IStudent & { _id: string, class_id: any })[];
};

export function useParents(options?: { skip?: boolean; filterByYear?: boolean }) {
  const [parents, setParents] = useState<ApiParent[]>([]);
  const [totalParents, setTotalParents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();
  const { academicYear } = useAppState();

  const fetchParents = useCallback(async (params: {
    page?: number;
    limit?: number | "all" | string;
    search?: string;
    academic_year?: string;
    class_id?: string;
    section?: string;
    student_id?: string;
    status?: string;
    guardian_type?: string;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.search) qs.set("search", params.search);
      if (params.academic_year) qs.set("academic_year", params.academic_year);
      if (params.class_id) qs.set("class_id", params.class_id);
      if (params.section) qs.set("section", params.section);
      if (params.student_id) qs.set("student_id", params.student_id);
      if (params.status) qs.set("status", params.status);
      if (params.guardian_type) qs.set("guardian_type", params.guardian_type);

      const res = await fetch(`/api/parents?${qs.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setParents(data.data.parents || []);
        setTotalParents(data.data.pagination?.totalItems || 0);
      } else {
        setError(data.message || "Failed to fetch parents");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    if (!authReady) return; // Wait until JWT token is available
    const params: { academic_year?: string; limit?: string } = { limit: "all" };
    if (options?.filterByYear) params.academic_year = academicYear;
    fetchParents(params);
  }, [fetchParents, academicYear, options?.skip, options?.filterByYear, authReady]);

  const createParent = async (payload: Partial<ApiParent> & { children_ids?: string[] }) => {
    const res = await fetch("/api/parents", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setParents((prev) => [...prev, data.data]);
      return data.data;
    }
    throw new Error(data.message || "Failed to create parent");
  };

  const updateParent = async (id: string, payload: Partial<ApiParent>) => {
    const res = await fetch(`/api/parents/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      setParents((prev) => prev.map((p) => (p._id === id ? data.data : p)));
      return data.data;
    }
    throw new Error(data.message || "Failed to update parent");
  };

  const deleteParent = async (id: string) => {
    const res = await fetch(`/api/parents/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      setParents((prev) => prev.filter((p) => p._id !== id));
      return true;
    }
    throw new Error(data.message || "Failed to delete parent");
  };

  return { parents, totalParents, isLoading, error, fetchParents, createParent, updateParent, deleteParent };
}
