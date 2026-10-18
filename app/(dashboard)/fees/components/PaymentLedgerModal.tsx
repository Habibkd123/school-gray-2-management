"use client";

import React, { useState } from "react";
import { Modal } from "@/app/components/ui/modal";
import { Loader2, RotateCcw, Trash2, Ban, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PaymentLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    _id: string;
    name: string;
  } | null;
  logs: any[];
  isLoading: boolean;
  formatDate: (dateStr: any) => string;
  formatMoney: (val: number) => string;
  onVoidPayment?: (paymentId: string) => Promise<void>;
  onRestorePayment?: (paymentId: string) => Promise<void>;
  onPermanentDeletePayment?: (paymentId: string) => Promise<void>;
}

export function PaymentLedgerModal({
  isOpen,
  onClose,
  student,
  logs,
  isLoading,
  formatDate,
  formatMoney,
  onVoidPayment,
  onRestorePayment,
  onPermanentDeletePayment,
}: PaymentLedgerModalProps) {
  const [activeTab, setActiveTab] = useState<"active" | "cancelled">("active");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "void" | "restore" | "permanent";
    payment: any;
  } | null>(null);

  if (!student) return null;

  const activeLogs = logs.filter((log: any) => !log.is_deleted);
  const cancelledLogs = logs.filter((log: any) => Boolean(log.is_deleted));

  const handleExecuteAction = async () => {
    if (!confirmDialog) return;
    const { type, payment } = confirmDialog;
    setActionLoadingId(payment._id);
    try {
      if (type === "void" && onVoidPayment) {
        await onVoidPayment(payment._id);
      } else if (type === "restore" && onRestorePayment) {
        await onRestorePayment(payment._id);
      } else if (type === "permanent" && onPermanentDeletePayment) {
        await onPermanentDeletePayment(payment._id);
      }
    } finally {
      setActionLoadingId(null);
      setConfirmDialog(null);
    }
  };

  return (
    <Modal size="lg" isOpen={isOpen} onClose={onClose} title={`Payment Ledger - ${student.name}`}>
      <div className="space-y-4 text-left">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-primary text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Active Receipts</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "active" ? "bg-white/20 text-white" : "bg-white text-slate-700"
              }`}
            >
              {activeLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cancelled")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "cancelled"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-red-50 text-red-700 hover:bg-red-100"
            }`}
          >
            <span>Cancelled / Voided</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "cancelled" ? "bg-white/20 text-white" : "bg-red-200 text-red-800"
              }`}
            >
              {cancelledLogs.length}
            </span>
          </button>
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="h-44 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === "active" ? (
          // Active Logs Table
          activeLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs">
              No active payment transactions recorded for this student.
            </div>
          ) : (
            <div className="erp-table-wrap overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Payment Date</th>
                    <th>Method</th>
                    <th className="col-right">Amount</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLogs.map((log: any) => (
                    <tr key={log._id}>
                      <td className="font-sans font-bold text-primary">{log.receipt_number || log.receipt_no}</td>
                      <td className="font-semibold">{formatDate(log.payment_date)}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                          {log.payment_method}
                        </span>
                      </td>
                      <td className="col-right font-sans font-bold text-emerald-600">
                        {formatMoney(log.amount_paid || log.total_amount)}
                      </td>
                      <td className="text-center">
                        {onVoidPayment && (
                          <button
                            type="button"
                            onClick={() => setConfirmDialog({ type: "void", payment: log })}
                            disabled={actionLoadingId === log._id}
                            className="px-2 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                            title="Cancel / Void this receipt"
                          >
                            {actionLoadingId === log._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // Cancelled Logs Table
          cancelledLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs">
              No cancelled or voided receipts for this student.
            </div>
          ) : (
            <div className="erp-table-wrap overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Cancellation Details</th>
                    <th>Method</th>
                    <th className="col-right">Original Amount</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cancelledLogs.map((log: any) => (
                    <tr key={log._id} className="bg-red-50/30">
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-sans font-bold text-slate-600 line-through">
                            {log.receipt_number || log.receipt_no}
                          </span>
                          <span className="inline-block px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-extrabold w-max">
                            VOIDED
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="text-[11px] text-slate-600">
                          <div>Cancelled: <span className="font-semibold">{formatDate(log.deleted_at || log.updatedAt)}</span></div>
                          {log.deleted_by && (
                            <div className="text-[10px] text-slate-400">
                              By: {log.deleted_by.name || log.deleted_by.username || "Admin"}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                          {log.payment_method}
                        </span>
                      </td>
                      <td className="col-right font-sans font-bold text-slate-400 line-through">
                        {formatMoney(log.amount_paid || log.total_amount)}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onRestorePayment && (
                            <button
                              type="button"
                              onClick={() => setConfirmDialog({ type: "restore", payment: log })}
                              disabled={actionLoadingId === log._id}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                              title="Restore payment back into active ledger"
                            >
                              {actionLoadingId === log._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              Restore
                            </button>
                          )}

                          {onPermanentDeletePayment && (
                            <button
                              type="button"
                              onClick={() => setConfirmDialog({ type: "permanent", payment: log })}
                              disabled={actionLoadingId === log._id}
                              className="px-2 py-1 text-[11px] font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded border border-red-300 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                              title="Delete permanently from database"
                            >
                              {actionLoadingId === log._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Purge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Confirmation Sub-Modal */}
        {confirmDialog && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 text-left font-sans border border-border">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-full shrink-0 ${
                    confirmDialog.type === "restore"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {confirmDialog.type === "restore" ? (
                    <RotateCcw className="w-5 h-5" />
                  ) : confirmDialog.type === "permanent" ? (
                    <Trash2 className="w-5 h-5" />
                  ) : (
                    <Ban className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">
                    {confirmDialog.type === "restore"
                      ? "Restore Fee Payment Receipt"
                      : confirmDialog.type === "permanent"
                      ? "Permanently Purge Receipt"
                      : "Cancel / Void Fee Payment Receipt"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Receipt #{confirmDialog.payment.receipt_number || confirmDialog.payment.receipt_no} (
                    {formatMoney(confirmDialog.payment.amount_paid || confirmDialog.payment.total_amount)})
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {confirmDialog.type === "restore"
                  ? "This receipt will be restored to Active status and will once again be counted as paid towards the student's dues."
                  : confirmDialog.type === "permanent"
                  ? "WARNING: This payment will be permanently deleted from the database. This action CANNOT be undone."
                  : "This will void the payment receipt. The amount will no longer be considered paid, and the student's due balance will reflect the unpaid dues."}
              </p>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  disabled={Boolean(actionLoadingId)}
                  className="px-3 py-1.5 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={Boolean(actionLoadingId)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg text-white transition-colors flex items-center gap-1.5 shadow-sm ${
                    confirmDialog.type === "restore"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : confirmDialog.type === "permanent"
                      ? "bg-red-700 hover:bg-red-800"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {actionLoadingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {confirmDialog.type === "restore"
                    ? "Confirm Restore"
                    : confirmDialog.type === "permanent"
                    ? "Permanently Delete"
                    : "Confirm Void"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end border-t border-border pt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close Logs
          </button>
        </div>
      </div>
    </Modal>
  );
}
