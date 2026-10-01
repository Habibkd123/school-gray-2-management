"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders, useAuthReady } from "@/lib/utils/session";
import { useAppState } from "@/app/context/store";
import { cacheSync, invalidateCache } from "@/lib/utils/cache-sync";

// ─── Shared cache constants ────────────────────────────────────────
const FEE_CACHE_TTL_MS = 60_000;

// ─── Fee Groups module-level cache ────────────────────────────────
let _feeGroupsCache: ApiFeeGroup[] | null = null;
let _feeGroupsCacheTime = 0;
let _feeGroupsInFlight: Promise<ApiFeeGroup[]> | null = null;
const _feeGroupsListeners = new Set<(groups: ApiFeeGroup[]) => void>();

// ─── Fee Types module-level cache ─────────────────────────────────
let _feeTypesCache: ApiFeeType[] | null = null;
let _feeTypesCacheTime = 0;
let _feeTypesInFlight: Promise<ApiFeeType[]> | null = null;
const _feeTypesListeners = new Set<(types: ApiFeeType[]) => void>();

export interface ApiFeeGroup {
  _id: string;
  name: string;
  description: string;
}

export interface ApiFeeType {
  _id: string;
  name: string;
  description: string;
}

export interface ApiFeeMaster {
  _id: string;
  fee_group_id: ApiFeeGroup | string;
  fee_type_id: ApiFeeType | string;
  amount: number;
  due_date: string;
}

export interface ApiFeeAllocation {
  _id: string;
  student_id: any;
  fee_group_id: any;
}

export interface ApiFeePayment {
  _id: string;
  student_id: any;
  fee_master_id: any;
  amount_paid: number;
  payment_method: string;
  transaction_date: string;
  receipt_number: string;
  remarks?: string;
  createdAt?: string;
  payment_date?: string;
}

export function useFeeGroups() {
  const isFresh = _feeGroupsCache !== null && (Date.now() - _feeGroupsCacheTime) < FEE_CACHE_TTL_MS;
  const [groups, setGroups] = useState<ApiFeeGroup[]>(_feeGroupsCache ?? []);
  const [loading, setLoading] = useState(!isFresh);
  const authReady = useAuthReady();

  useEffect(() => {
    const listener = (data: ApiFeeGroup[]) => setGroups(data);
    _feeGroupsListeners.add(listener);
    return () => { _feeGroupsListeners.delete(listener); };
  }, []);

  const fetchGroups = useCallback(async () => {
    // Serve from cache if fresh
    if (_feeGroupsCache !== null && (Date.now() - _feeGroupsCacheTime) < FEE_CACHE_TTL_MS) {
      setGroups(_feeGroupsCache);
      setLoading(false);
      return;
    }
    // Dedup in-flight requests
    if (_feeGroupsInFlight) {
      setLoading(true);
      try {
        const data = await _feeGroupsInFlight;
        setGroups(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
      return;
    }
    setLoading(true);
    const promise = (async (): Promise<ApiFeeGroup[]> => {
      const res = await fetch("/api/fees/groups", { headers: getAuthHeaders() });
      const data = await res.json();
      const list: ApiFeeGroup[] = data.success ? (data.data.groups || []) : [];
      _feeGroupsCache = list;
      _feeGroupsCacheTime = Date.now();
      _feeGroupsInFlight = null;
      _feeGroupsListeners.forEach((fn) => fn(list));
      return list;
    })();
    _feeGroupsInFlight = promise;
    try {
      const list = await promise;
      setGroups(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    fetchGroups();
  }, [fetchGroups, authReady]);

  useEffect(() => {
    const unsub = cacheSync.subscribe("fees", () => {
      _feeGroupsCache = null;
      _feeGroupsCacheTime = 0;
      fetchGroups();
    });
    return unsub;
  }, [fetchGroups]);

  const createGroup = async (payload: any) => {
    const res = await fetch("/api/fees/groups", { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    _feeGroupsCache = null;
    invalidateCache("fees");
    if (res.ok) fetchGroups();
    return res.json();
  };

  const updateGroup = async (id: string, payload: any) => {
    const res = await fetch(`/api/fees/groups/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    _feeGroupsCache = null;
    invalidateCache("fees");
    if (res.ok) fetchGroups();
    return res.json();
  };

  const deleteGroup = async (id: string) => {
    const res = await fetch(`/api/fees/groups/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    _feeGroupsCache = null;
    invalidateCache("fees");
    if (res.ok) fetchGroups();
    return res.json();
  };

  return { groups, loading, fetchGroups, createGroup, updateGroup, deleteGroup };
}

export function useFeeTypes() {
  const isFresh = _feeTypesCache !== null && (Date.now() - _feeTypesCacheTime) < FEE_CACHE_TTL_MS;
  const [types, setTypes] = useState<ApiFeeType[]>(_feeTypesCache ?? []);
  const [loading, setLoading] = useState(!isFresh);
  const authReady = useAuthReady();

  useEffect(() => {
    const listener = (data: ApiFeeType[]) => setTypes(data);
    _feeTypesListeners.add(listener);
    return () => { _feeTypesListeners.delete(listener); };
  }, []);

  const fetchTypes = useCallback(async () => {
    if (_feeTypesCache !== null && (Date.now() - _feeTypesCacheTime) < FEE_CACHE_TTL_MS) {
      setTypes(_feeTypesCache);
      setLoading(false);
      return;
    }
    if (_feeTypesInFlight) {
      setLoading(true);
      try {
        const data = await _feeTypesInFlight;
        setTypes(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
      return;
    }
    setLoading(true);
    const promise = (async (): Promise<ApiFeeType[]> => {
      const res = await fetch("/api/fees/types", { headers: getAuthHeaders() });
      const data = await res.json();
      const list: ApiFeeType[] = data.success ? (data.data.types || []) : [];
      _feeTypesCache = list;
      _feeTypesCacheTime = Date.now();
      _feeTypesInFlight = null;
      _feeTypesListeners.forEach((fn) => fn(list));
      return list;
    })();
    _feeTypesInFlight = promise;
    try {
      const list = await promise;
      setTypes(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    fetchTypes();
  }, [fetchTypes, authReady]);

  useEffect(() => {
    const unsub = cacheSync.subscribe("fees", () => {
      _feeTypesCache = null;
      _feeTypesCacheTime = 0;
      fetchTypes();
    });
    return unsub;
  }, [fetchTypes]);

  const createType = async (payload: any) => {
    const res = await fetch("/api/fees/types", { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    _feeTypesCache = null;
    invalidateCache("fees");
    if (res.ok) fetchTypes();
    return res.json();
  };

  const updateType = async (id: string, payload: any) => {
    const res = await fetch(`/api/fees/types/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    _feeTypesCache = null;
    invalidateCache("fees");
    if (res.ok) fetchTypes();
    return res.json();
  };

  const deleteType = async (id: string) => {
    const res = await fetch(`/api/fees/types/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    _feeTypesCache = null;
    invalidateCache("fees");
    if (res.ok) fetchTypes();
    return res.json();
  };

  return { types, loading, fetchTypes, createType, updateType, deleteType };
}

export function useFeeMasters(options?: { skip?: boolean }) {
  const [masters, setMasters] = useState<ApiFeeMaster[]>([]);
  const [loading, setLoading] = useState(options?.skip ? false : true);

  const fetchMasters = useCallback(async (groupId?: string) => {
    setLoading(true);
    try {
      const url = groupId ? `/api/fees/master?fee_group_id=${groupId}` : "/api/fees/master";
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setMasters(data.data.masters);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    fetchMasters();
  }, [fetchMasters, options?.skip]);

  const createMaster = async (payload: any) => {
    const res = await fetch("/api/fees/master", { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    if (res.ok) fetchMasters();
    return res.json();
  };

  const updateMaster = async (id: string, payload: any) => {
    const res = await fetch(`/api/fees/master/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    if (res.ok) fetchMasters();
    return res.json();
  };

  const deleteMaster = async (id: string) => {
    const res = await fetch(`/api/fees/master/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    if (res.ok) fetchMasters();
    return res.json();
  };

  return { masters, loading, fetchMasters, createMaster, updateMaster, deleteMaster };
}

export function useFeeAllocations(studentId?: string, options?: { skip?: boolean }) {
  const [allocations, setAllocations] = useState<ApiFeeAllocation[]>([]);
  const [loading, setLoading] = useState(options?.skip ? false : true);

  const fetchAllocations = useCallback(async (sId?: string) => {
    setLoading(true);
    try {
      const url = sId ? `/api/fees/allocations?student_id=${sId}` : "/api/fees/allocations";
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setAllocations(data.data.allocations);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    fetchAllocations(studentId);
  }, [fetchAllocations, studentId, options?.skip]);

  const allocateFees = async (payload: { fee_group_id: string; student_ids: string[]; unassign_student_ids?: string[] }) => {
    const res = await fetch("/api/fees/allocations", { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    if (res.ok) fetchAllocations(studentId);
    return res.json();
  };

  return { allocations, loading, fetchAllocations, allocateFees };
}

export function useFeePayments(studentId?: string, options?: { skip?: boolean; limit?: number }) {
  const [payments, setPayments] = useState<ApiFeePayment[]>([]);
  const [loading, setLoading] = useState(options?.skip ? false : true);

  const fetchPayments = useCallback(async (sId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sId) params.set("student_id", sId);
      if (options?.limit) params.set("limit", String(options.limit));
      const qs = params.toString();
      const url = qs ? `/api/fees/payments?${qs}` : "/api/fees/payments";
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setPayments(data.data.payments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [options?.limit]);

  useEffect(() => {
    if (options?.skip) return;
    fetchPayments(studentId);
  }, [fetchPayments, studentId, options?.skip]);

  const recordPayment = async (payload: any) => {
    const res = await fetch("/api/fees/payments", { method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() }, body: JSON.stringify(payload) });
    if (res.ok) fetchPayments(studentId);
    return res.json();
  };

  return { payments, loading, fetchPayments, recordPayment };
}

export function useFees() {
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { academicYear } = useAppState();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (academicYear) params.set("academic_year", academicYear);

      const structRes = await fetch(`/api/fees?${params.toString()}`, { headers: getAuthHeaders() });
      const structData = await structRes.json();
      const fetchedStructures = structData.success ? structData.data.fees : [];
      setFeeStructures(fetchedStructures);

      const paymentRes = await fetch("/api/fees/payments", { headers: getAuthHeaders() });
      const paymentData = await paymentRes.json();
      const fetchedPayments = paymentData.success ? paymentData.data.payments : [];

      const mappedPayments = fetchedPayments.map((p: any) => ({
        ...p,
        receipt_no: p.receipt_number || p.receipt_no,
        total_amount: p.amount_paid || p.total_amount || 0,
        payment_date: p.transaction_date || p.payment_date || p.createdAt,
        status: p.status || "success",
      }));
      setPayments(mappedPayments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const unsub = cacheSync.subscribe("fees", () => {
      fetchAll();
    });
    return unsub;
  }, [fetchAll]);

  const createFeeStructure = async (payload: any) => {
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        invalidateCache("fees");
        fetchAll();
      }
      return res.json();
    } catch (e) {
      console.error(e);
      return { success: false, message: "Network error" };
    }
  };

  const recordPayment = async (payload: any) => {
    try {
      const mastersRes = await fetch("/api/fees/master", { headers: getAuthHeaders() });
      const mastersData = await mastersRes.json();
      let feeMasterId = "";

      if (mastersData.success && mastersData.data.masters && mastersData.data.masters.length > 0) {
        feeMasterId = mastersData.data.masters[0]._id;
      } else {
        const groupsRes = await fetch("/api/fees/groups", { headers: getAuthHeaders() });
        const groupsData = await groupsRes.json();
        let groupId = "";
        if (groupsData.success && groupsData.data.groups && groupsData.data.groups.length > 0) {
          groupId = groupsData.data.groups[0]._id;
        } else {
          const newGroupRes = await fetch("/api/fees/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ name: "General Fees", description: "Default fee group" })
          });
          const newGroupData = await newGroupRes.json();
          if (newGroupData.success) groupId = newGroupData.data.group._id;
        }

        const typesRes = await fetch("/api/fees/types", { headers: getAuthHeaders() });
        const typesData = await typesRes.json();
        let typeId = "";
        if (typesData.success && typesData.data.types && typesData.data.types.length > 0) {
          typeId = typesData.data.types[0]._id;
        } else {
          const newTypeRes = await fetch("/api/fees/types", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ name: "Tuition Fee", description: "Default tuition fee type" })
          });
          const newTypeData = await newTypeRes.json();
          if (newTypeData.success) typeId = newTypeData.data.type._id;
        }

        if (groupId && typeId) {
          const newMasterRes = await fetch("/api/fees/master", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({
              fee_group_id: groupId,
              fee_type_id: typeId,
              amount: payload.amount_paid || 1000,
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
          });
          const newMasterData = await newMasterRes.json();
          if (newMasterData.success) {
            feeMasterId = newMasterData.data.master._id;
          }
        }
      }

      const bodyPayload = {
        student_id: payload.student_id === "000000000000000000000000" ? undefined : payload.student_id,
        fee_master_id: feeMasterId,
        amount_paid: payload.amount_paid,
        payment_method: payload.payment_method === "card" ? "Online" : payload.payment_method,
        remarks: payload.remarks || "Paid via Checkout Sandbox"
      };

      if (!bodyPayload.student_id || bodyPayload.student_id === "000000000000000000000000") {
        const studentsRes = await fetch("/api/students", { headers: getAuthHeaders() });
        const studentsData = await studentsRes.json();
        if (studentsData.success && studentsData.data.students && studentsData.data.students.length > 0) {
          bodyPayload.student_id = studentsData.data.students[0]._id;
        } else {
          bodyPayload.student_id = "000000000000000000000000";
        }
      }

      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(bodyPayload),
      });
      if (res.ok) {
        invalidateCache("fees");
        fetchAll();
      }
      return res.json();
    } catch (e) {
      console.error(e);
      return { success: false, message: "Network error" };
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + p.total_amount, 0);
  const totalPending = feeStructures.reduce((sum, f) => sum + f.amount, 0) * 15;
  const totalOverdue = feeStructures.reduce((sum, f) => sum + f.amount, 0) * 3;

  return {
    feeStructures,
    payments,
    loading,
    totalCollected,
    totalPending,
    totalOverdue,
    createFeeStructure,
    recordPayment,
    fetchAll
  };
}
