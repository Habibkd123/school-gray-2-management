"use client";

import React from "react";
import { Modal } from "@/app/components/ui/modal";
import { AlertCircle, Loader2 } from "lucide-react";

interface BulkCollectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  date: string;
  onDateChange: (date: string) => void;
  paymentMethod: "Cash" | "Cheque" | "Bank Transfer" | "Online" | "UPI";
  onMethodChange: (method: "Cash" | "Cheque" | "Bank Transfer" | "Online" | "UPI") => void;
  remarks: string;
  onRemarksChange: (remarks: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

export function BulkCollectModal({
  isOpen,
  onClose,
  selectedCount,
  date,
  onDateChange,
  paymentMethod,
  onMethodChange,
  remarks,
  onRemarksChange,
  onSubmit,
  isProcessing,
}: BulkCollectModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Bulk Payments Collection">
      <div className="space-y-4 text-left text-xs font-sans">
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-bold flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
          <span>You are recording full outstanding dues collection for {selectedCount} student(s).</span>
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label className="font-bold text-slate-500">Collection Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label className="font-bold text-slate-500">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => onMethodChange(e.target.value as any)}
            className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white outline-none cursor-pointer"
          >
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Online">Online</option>
            <option value="UPI">UPI</option>
          </select>
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label className="font-bold text-slate-500">Remarks / Reference</label>
          <textarea
            value={remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            placeholder="Remarks for this bulk transaction log..."
            className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-white outline-none min-h-[60px]"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border text-xs font-bold rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isProcessing}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm Collection
          </button>
        </div>
      </div>
    </Modal>
  );
}
