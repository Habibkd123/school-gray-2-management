"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  DollarSign,
  Plus,
  SlidersHorizontal,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ChevronDown,
  Trash2,
  Save,
  X,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/app/components/ui/modal";
import { useClasses, ApiClass } from "@/app/hooks/useClasses";
import { useAppState } from "@/app/context/store";
import { getAuthHeaders } from "@/lib/utils/session";

interface FeeTypeItem {
  name: string;
  amount: number;
  frequency?: "One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly";
  is_mandatory?: boolean;
  is_enabled: boolean;
}

interface ClassFeeConfig {
  _id?: string;
  school_id: string;
  class_id: string;
  academic_year: string;
  fee_types: FeeTypeItem[];
  total_amount: number;
}

const DEFAULT_FEE_HEADS: FeeTypeItem[] = [
  { name: "Tuition Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
  { name: "Academic Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
  { name: "Exam Fees", amount: 0, frequency: "Quarterly", is_mandatory: true, is_enabled: true },
  { name: "Computer Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
  { name: "Library Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
  { name: "Transport Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
  { name: "Admission Fees", amount: 0, frequency: "One Time", is_mandatory: false, is_enabled: false },
  { name: "Other Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
];

export default function ClassFeesSettingsTab() {
  const { classes, isLoading: isClassesLoading, fetchClasses } = useClasses();
  const { academicYear } = useAppState();

  const [selectedYear, setSelectedYear] = useState(academicYear || "2026-2027");
  const [directClasses, setDirectClasses] = useState<ApiClass[]>([]);
  const [classFees, setClassFees] = useState<Record<string, ClassFeeConfig>>({});
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ApiClass | null>(null);
  const [feeItems, setFeeItems] = useState<FeeTypeItem[]>([]);
  const [quickAmount, setQuickAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New Custom Fee head state inside modal
  const [newHeadName, setNewHeadName] = useState("");
  const [newHeadAmount, setNewHeadAmount] = useState("");
  const [newHeadFreq, setNewHeadFreq] = useState<"One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly">("Monthly");

  // Copy Fees Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceClassId, setCopySourceClassId] = useState("");
  const [copyTargetClassIds, setCopyTargetClassIds] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  // Load Class Fees & Classes from API
  const loadClassFees = useCallback(async () => {
    setIsLoadingFees(true);
    try {
      const res = await fetch(`/api/fees/class-defaults?academic_year=${encodeURIComponent(selectedYear)}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const feesList = Array.isArray(json.data) ? json.data : (json.data.fees || []);
        const fetchedClasses = json.data.classes || [];
        if (Array.isArray(fetchedClasses) && fetchedClasses.length > 0) {
          setDirectClasses(fetchedClasses);
        }
        const map: Record<string, ClassFeeConfig> = {};
        feesList.forEach((cf: ClassFeeConfig) => {
          map[cf.class_id.toString()] = cf;
        });
        setClassFees(map);
      }
    } catch (err: any) {
      console.error("Failed to load class fees:", err);
      setErrorMsg("Failed to load class fee settings.");
    } finally {
      setIsLoadingFees(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchClasses({ limit: "all" as any });
    loadClassFees();
  }, [loadClassFees, fetchClasses]);

  useEffect(() => {
    if (academicYear && academicYear !== selectedYear) {
      setSelectedYear(academicYear);
    }
  }, [academicYear]);

  // Open Edit Modal for a class
  const handleOpenEdit = (cls: ApiClass) => {
    setEditingClass(cls);
    const existing = classFees[cls._id];
    if (existing && existing.fee_types && existing.fee_types.length > 0) {
      setFeeItems(existing.fee_types.map((f) => ({ ...f })));
      setQuickAmount(existing.total_amount ? String(existing.total_amount) : "");
    } else {
      setFeeItems(DEFAULT_FEE_HEADS.map((f) => ({ ...f })));
      setQuickAmount("");
    }
    setNewHeadName("");
    setNewHeadAmount("");
    setIsEditModalOpen(true);
  };

  // Quick Amount apply handler
  const handleApplyQuickAmount = () => {
    const amt = Math.max(0, Number(quickAmount) || 0);
    // Set Tuition Fees to this amount, others to 0
    setFeeItems((prev) =>
      prev.map((ft) => {
        if (ft.name.toLowerCase().includes("tuition")) {
          return { ...ft, amount: amt, is_enabled: true };
        }
        return { ...ft, amount: 0, is_enabled: ft.is_mandatory ? true : false };
      })
    );
  };

  // Toggle fee item enabled
  const handleToggleFeeEnabled = (index: number) => {
    setFeeItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, is_enabled: !item.is_enabled } : item))
    );
  };

  // Update item amount
  const handleItemAmountChange = (index: number, val: number) => {
    setFeeItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, amount: Math.max(0, val) } : item))
    );
  };

  // Update item frequency
  const handleItemFreqChange = (index: number, val: any) => {
    setFeeItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, frequency: val } : item))
    );
  };

  // Add custom fee head
  const handleAddCustomHead = () => {
    if (!newHeadName.trim()) return;
    const amt = Math.max(0, Number(newHeadAmount) || 0);
    setFeeItems((prev) => [
      ...prev,
      {
        name: newHeadName.trim(),
        amount: amt,
        frequency: newHeadFreq,
        is_mandatory: true,
        is_enabled: true,
      },
    ]);
    setNewHeadName("");
    setNewHeadAmount("");
  };

  // Remove custom fee head
  const handleRemoveCustomHead = (index: number) => {
    setFeeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Total configured in modal
  const modalTotal = useMemo(() => {
    return feeItems
      .filter((ft) => ft.is_enabled)
      .reduce((sum, ft) => sum + (Number(ft.amount) || 0), 0);
  }, [feeItems]);

  // Save Class Fee Handler
  const handleSaveFee = async () => {
    if (!editingClass) return;
    setIsSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/fees/class-defaults", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: editingClass._id,
          academic_year: selectedYear,
          fee_types: feeItems,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Default fees for ${editingClass.name} saved successfully.`);
        setTimeout(() => setSuccessMsg(""), 4000);
        setIsEditModalOpen(false);
        loadClassFees();
      } else {
        setErrorMsg(json.message || "Failed to save default class fee.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Network error while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const effectiveClasses = directClasses.length > 0 ? directClasses : classes;

  // Open Copy Fees Modal
  const handleOpenCopy = () => {
    const configuredClasses = effectiveClasses.filter((c) => Boolean(classFees[c._id]));
    setCopySourceClassId(configuredClasses[0]?._id || effectiveClasses[0]?._id || "");
    setCopyTargetClassIds([]);
    setIsCopyModalOpen(true);
  };

  // Submit Copy Fees
  const handleExecuteCopy = async () => {
    if (!copySourceClassId || copyTargetClassIds.length === 0) {
      setErrorMsg("Please select a source class and at least one target class.");
      return;
    }

    setIsCopying(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/fees/class-defaults", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          copy_from_class_id: copySourceClassId,
          class_ids: copyTargetClassIds,
          academic_year: selectedYear,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || "Fee structure copied successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
        setIsCopyModalOpen(false);
        loadClassFees();
      } else {
        setErrorMsg(json.message || "Failed to copy fees.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Network error while copying.");
    } finally {
      setIsCopying(false);
    }
  };

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return effectiveClasses.filter((cls) => {
      const fullName = `${cls.name} ${cls.section || ""}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase());
    });
  }, [effectiveClasses, searchQuery]);

  return (
    <div className="space-y-6 text-left">
      {/* Header card with gradient badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            </span>
            <h2 className="text-lg font-bold">Default Class Fees</h2>
          </div>
          <p className="text-xs text-slate-350 mt-1.5 leading-relaxed">
            Set the default fee structure for each class. Admitted students will automatically inherit these fees.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCopy}
            disabled={effectiveClasses.length === 0}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer border border-white/10 disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-300" />
            <span>Copy Fees to Other Classes</span>
          </button>

          <button
            onClick={() => loadClassFees()}
            disabled={isLoadingFees}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer border border-white/10"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingFees ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Feedback alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Controls Bar: Search & Academic Session */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search classes by name or section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-xl text-xs font-medium outline-none bg-white dark:bg-slate-900 text-foreground focus:border-primary/50 transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Session:</span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg border border-border">
            {selectedYear}
          </span>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm overflow-hidden">
        {isClassesLoading || isLoadingFees ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-semibold">Loading class fee configurations...</span>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Layers className="w-8 h-8 opacity-30" />
            <p className="text-xs font-semibold">No classes found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-slate-50/60 dark:bg-slate-800/20 text-[11px] uppercase tracking-wider text-slate-450 font-bold">
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Configured Fee Heads</th>
                  <th className="py-3 px-4 text-right">Default Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredClasses.map((cls) => {
                  const feeConfig = classFees[cls._id];
                  const hasFee = Boolean(feeConfig && feeConfig.total_amount > 0);
                  const enabledHeads = feeConfig?.fee_types?.filter((f) => f.is_enabled) || [];

                  return (
                    <tr
                      key={cls._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                        {cls.name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-500">
                        {cls.section ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-[11px]">
                            {cls.section}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {enabledHeads.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {enabledHeads.slice(0, 3).map((h, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200/50 dark:border-indigo-800/40"
                              >
                                {h.name}: ₹{h.amount}
                              </span>
                            ))}
                            {enabledHeads.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold text-[11px]">
                                +{enabledHeads.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not configured</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans font-bold text-slate-900 dark:text-white">
                        {hasFee ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px]">
                            ₹{feeConfig.total_amount.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">₹0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(cls)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-lg transition-colors cursor-pointer border border-primary/20"
                        >
                          {hasFee ? "Edit Fees" : "Set Fee"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT CLASS FEE MODAL */}
      <Modal
        size="lg"
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingClass ? `Configure Default Fee: ${editingClass.name}${editingClass.section ? ` - ${editingClass.section}` : ""}` : "Configure Class Fee"}
      >
        <div className="space-y-5 text-left">
          {/* Quick-Set Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-border rounded-xl">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
              Quick Set Total Default Fee
            </span>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 3500"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-xs font-bold outline-none bg-white dark:bg-slate-900 text-foreground"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyQuickAmount}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Apply as Tuition Fee
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Instantly applies this amount to the tuition fee, or adjust specific fee heads below.
            </p>
          </div>

          {/* Fee Heads List */}
          <div className="border border-border rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Fee Heads Breakdown
              </span>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFeeItems(feeItems.map((f) => ({ ...f, is_enabled: true })))}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Enable All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setFeeItems(feeItems.map((f) => ({ ...f, is_enabled: false })))}
                  className="text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  Disable All
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {feeItems.map((ft, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-12 gap-3 items-center px-3 py-2 border rounded-xl transition-all ${
                    ft.is_enabled
                      ? "bg-white dark:bg-slate-900 border-border"
                      : "bg-slate-50/40 dark:bg-slate-950/20 border-transparent opacity-60"
                  }`}
                >
                  <div className="col-span-5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleFeeEnabled(index)}
                      className={`w-7 h-4 rounded-full relative cursor-pointer transition-colors focus:outline-none shrink-0 ${
                        ft.is_enabled ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
                          ft.is_enabled ? "left-[13px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">
                      {ft.name}
                    </span>
                  </div>

                  <div className="col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={ft.amount}
                        disabled={!ft.is_enabled}
                        onChange={(e) => handleItemAmountChange(index, Number(e.target.value))}
                        className="w-full pl-6 pr-2 py-1 text-right text-xs font-bold border border-border rounded-lg bg-transparent outline-none disabled:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <select
                      value={ft.frequency || "Monthly"}
                      disabled={!ft.is_enabled}
                      onChange={(e) => handleItemFreqChange(index, e.target.value)}
                      className="px-2 py-1 text-[11px] font-semibold border border-border rounded-lg bg-white dark:bg-slate-900 outline-none cursor-pointer disabled:text-slate-400"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half Yearly">Half Yearly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="One Time">One Time</option>
                    </select>

                    {index >= DEFAULT_FEE_HEADS.length && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomHead(index)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Delete fee head"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Fee Head */}
            <div className="pt-2 border-t border-border flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Custom Fee Name (e.g. Sports Fee)"
                value={newHeadName}
                onChange={(e) => setNewHeadName(e.target.value)}
                className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border border-border rounded-lg bg-white dark:bg-slate-900 outline-none"
              />
              <div className="relative w-24">
                <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newHeadAmount}
                  onChange={(e) => setNewHeadAmount(e.target.value)}
                  className="w-full pl-5 pr-2 py-1.5 text-xs font-bold border border-border rounded-lg bg-white dark:bg-slate-900 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomHead}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Total display summary */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Default Class Fee
              </span>
              <p className="text-[11px] text-slate-350 mt-0.5">Assigned automatically on student admission</p>
            </div>
            <span className="text-xl font-bold font-sans text-emerald-400">
              ₹{modalTotal.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveFee}
              disabled={isSaving}
              className="px-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Default Class Fee
            </button>
          </div>
        </div>
      </Modal>

      {/* COPY FEES MODAL */}
      <Modal
        size="md"
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Copy Fees to Other Classes"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-500 leading-relaxed">
            Select a configured source class to copy its entire fee structure to one or more other classes.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Source Class (Copy From)
            </label>
            <div className="relative">
              <select
                value={copySourceClassId}
                onChange={(e) => setCopySourceClassId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl text-xs font-bold bg-white dark:bg-slate-900 outline-none appearance-none cursor-pointer"
              >
                {effectiveClasses.map((cls) => {
                  const fee = classFees[cls._id];
                  const feeText = fee && fee.total_amount > 0 ? ` (₹${fee.total_amount})` : " (₹0)";
                  return (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                      {cls.section ? ` - ${cls.section}` : ""}
                      {feeText}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Target Classes (Apply To)
              </label>
              <button
                type="button"
                onClick={() => {
                  const availableTargets = effectiveClasses.filter((c) => c._id !== copySourceClassId).map((c) => c._id);
                  if (copyTargetClassIds.length === availableTargets.length) {
                    setCopyTargetClassIds([]);
                  } else {
                    setCopyTargetClassIds(availableTargets);
                  }
                }}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                {copyTargetClassIds.length > 0 ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="border border-border rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/50 dark:bg-slate-950/30">
              {effectiveClasses
                .filter((c) => c._id !== copySourceClassId)
                .map((cls) => {
                  const isChecked = copyTargetClassIds.includes(cls._id);
                  return (
                    <label
                      key={cls._id}
                      className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer text-xs font-semibold"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setCopyTargetClassIds((prev) =>
                            isChecked ? prev.filter((id) => id !== cls._id) : [...prev, cls._id]
                          );
                        }}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      />
                      <span>
                        {cls.name}
                        {cls.section ? ` - ${cls.section}` : ""}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsCopyModalOpen(false)}
              className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteCopy}
              disabled={isCopying || copyTargetClassIds.length === 0}
              className="px-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isCopying && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Copy Fees to {copyTargetClassIds.length} Class(es)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
