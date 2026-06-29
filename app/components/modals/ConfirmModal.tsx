import React from "react";
import { Modal } from "../ui/modal";
import { X, AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  confirmColor = "bg-[#EF4444] hover:bg-red-600",
  onConfirm 
}: ConfirmModalProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-[18px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <AlertCircle className="w-5 h-5 text-amber-500" />
             {title}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors dark:text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
           <p className="text-[14px] text-slate-600 dark:text-slate-300">
             {message}
           </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm">
            {cancelText}
          </button>
          <button 
             onClick={() => {
                onConfirm();
                onClose();
             }} 
             className={`px-5 py-2.5 rounded-lg text-[13px] font-bold text-white transition-colors shadow-sm ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
