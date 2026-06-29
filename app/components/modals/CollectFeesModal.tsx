import React from "react";
import { Modal } from "../ui/modal";
import { X, Calendar } from "lucide-react";
import { Student } from "../../context/store";

interface CollectFeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export function CollectFeesModal({ isOpen, onClose, student }: CollectFeesModalProps) {
  const [isPaid, setIsPaid] = React.useState(false);
  
  if (!student) return null;

  // Derive mock data for the UI
  const getAvatar = (name: string) => name.toLowerCase().match(/^[a-m]/) ? "/asset 12.webp" : "/asset 14.webp";
  const getSection = (id?: string) => {
    if (!id) return "A";
    return id.includes("1") ? "A" : id.includes("2") ? "B" : "C";
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">Collect Fees</h2>
            <span className="bg-[#3B82F6] text-white text-[11px] font-bold px-2 py-0.5 rounded">AD9892{student.rollNo}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
           
           {/* Top Info Banner */}
           <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <img src={getAvatar(student.name)} className="w-10 h-10 rounded object-cover" alt="Student" />
                 <div>
                   <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{student.name}</h3>
                   <p className="text-[12px] text-slate-500">III, {getSection((student as any)._id || student.id)}</p>
                 </div>
              </div>

              <div>
                <p className="text-[12px] font-medium text-slate-500">Total Outstanding</p>
                <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">2000</p>
              </div>

              <div>
                <p className="text-[12px] font-medium text-slate-500">Last Date</p>
                <p className="text-[14px] font-bold text-slate-900 dark:text-white mt-0.5">25 May 2024</p>
              </div>

              <div>
                 <span className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 ${isPaid ? 'bg-[#E1FDEB] text-[#10B981]' : 'bg-[#FFEBF0] text-[#EF4444]'}`}>
                   <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}></span> {isPaid ? 'Paid' : 'Unpaid'}
                 </span>
              </div>
           </div>

           {/* Form Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
             <div className="flex flex-col gap-1.5">
               <label className="text-[13px] font-bold text-slate-900 dark:text-white">Fees Group</label>
               <select className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                 <option>Select</option>
                 <option>Tuition Fees</option>
                 <option>Transport Fees</option>
               </select>
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[13px] font-bold text-slate-900 dark:text-white">Fees Type</label>
               <select className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                 <option>Select</option>
                 <option>Monthly</option>
                 <option>Yearly</option>
               </select>
             </div>
             
             <div className="flex flex-col gap-1.5">
               <label className="text-[13px] font-bold text-slate-900 dark:text-white">Amount</label>
               <input type="text" placeholder="Enter Amount" className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all" />
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[13px] font-bold text-slate-900 dark:text-white">Collection Date</label>
               <input type="date" className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
             </div>

             <div className="flex flex-col gap-1.5">
               <label className="text-[13px] font-bold text-slate-900 dark:text-white">Payment Type</label>
               <select className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                 <option>Select</option>
                 <option>Cash</option>
                 <option>Cheque</option>
                 <option>Online</option>
               </select>
             </div>
             <div className="flex flex-col gap-1.5">
               <label className="text-[13px] font-bold text-slate-900 dark:text-white">Payment Reference No</label>
               <input type="text" placeholder="Enter Payment Reference No" className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all" />
             </div>
           </div>

           <div className="flex items-center justify-between mb-5 bg-[#F8FAFC] dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
             <div>
               <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">Status</h4>
               <p className="text-[12px] text-slate-500">Change the Status by toggle</p>
             </div>
             {/* Toggle switch */}
             <button 
               type="button"
               onClick={() => setIsPaid(!isPaid)}
               className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors focus:outline-none ${isPaid ? 'bg-[#10B981]' : 'bg-slate-200 dark:bg-slate-700'}`}
             >
               <div className={`w-4 h-4 bg-white dark:bg-slate-900 rounded-full absolute top-0.5 shadow-sm transition-transform ${isPaid ? 'left-[22px]' : 'left-0.5'}`}></div>
             </button>
           </div>

           <div className="flex flex-col gap-1.5">
             <label className="text-[13px] font-bold text-slate-900 dark:text-white">Notes</label>
             <textarea rows={4} placeholder="Add Notes" className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 outline-none focus:border-primary/50 transition-all resize-none"></textarea>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-[#F1F5F9] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors shadow-sm">
            Pay Fees
          </button>
        </div>
      </div>
    </div>
  );
}
