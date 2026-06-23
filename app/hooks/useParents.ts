import { useState, useEffect } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { IParent } from "@/lib/models/Parent";
import { IStudent } from "@/lib/models/Student";

export type ApiParent = Omit<IParent, "school_id" | "user_id"> & {
  _id: string;
  children: (IStudent & { _id: string, class_id: any })[];
};

export function useParents() {
  const [parents, setParents] = useState<ApiParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return; // Wait until JWT token is available
    fetchParents();
  }, [authReady]);

  const fetchParents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/parents", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setParents(data.data);
      } else {
        setError(data.message || "Failed to fetch parents");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

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

  return { parents, isLoading, error, fetchParents, createParent, updateParent, deleteParent };
}
