"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";

export interface ApiRoom {
  _id: string;
  room_no: string;
  capacity: number;
  is_active: boolean;
  createdAt: string;
}

export function useRooms() {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rooms", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setRooms(data.data.rooms);
    } catch (e) {
      console.error("useRooms fetch error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const authReady = useAuthReady();
  useEffect(() => { if (!authReady) return; fetchRooms(); }, [fetchRooms, authReady]);

  const createRoom = useCallback(async (payload: { room_no: string; capacity: number; is_active: boolean }) => {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchRooms();
    return data;
  }, [fetchRooms]);

  const updateRoom = useCallback(async (id: string, payload: Partial<ApiRoom>) => {
    const res = await fetch(`/api/rooms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) await fetchRooms();
    return data;
  }, [fetchRooms]);

  const deleteRoom = useCallback(async (id: string) => {
    const res = await fetch(`/api/rooms/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.success) await fetchRooms();
    return data;
  }, [fetchRooms]);

  return { rooms, loading, fetchRooms, createRoom, updateRoom, deleteRoom };
}
