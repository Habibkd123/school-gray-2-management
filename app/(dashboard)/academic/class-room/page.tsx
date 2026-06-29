"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, Search, MoreVertical, Edit, Trash2,
  Filter, ChevronDown, RefreshCw, Printer, Download, ToggleRight, FileText, Loader2
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";
import { useRooms } from "../../../hooks/useRooms";

export default function ClassRoomPage() {
  const { rooms, loading, createRoom, updateRoom, deleteRoom } = useRooms();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form states
  const [formRoomNo, setFormRoomNo] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formStatus, setFormStatus] = useState(true);

  const openAddModal = () => {
    setFormRoomNo(""); setFormCapacity(""); setFormStatus(true);
    setIsAddOpen(true);
  };

  const openEditModal = (room: any) => {
    setSelectedRoom(room);
    setFormRoomNo(room.room_no);
    setFormCapacity(String(room.capacity));
    setFormStatus(room.is_active);
    setIsEditOpen(true);
    setActionMenuId(null);
  };

  const openDeleteModal = (room: any) => {
    setSelectedRoom(room);
    setIsDeleteOpen(true);
    setActionMenuId(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRoom({ room_no: formRoomNo, capacity: parseInt(formCapacity) || 40, is_active: formStatus });
    setIsAddOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoom) {
      await updateRoom(selectedRoom._id, { room_no: formRoomNo, capacity: parseInt(formCapacity) || 40, is_active: formStatus });
    }
    setIsEditOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (selectedRoom) await deleteRoom(selectedRoom._id);
    setIsDeleteOpen(false);
  };

  const filteredRooms = useMemo(() =>
    rooms.filter(r =>
      r.room_no.toLowerCase().includes(searchTerm.toLowerCase())
    ), [rooms, searchTerm]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Class Room</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span>
            <Link href="/academic" className="hover:text-primary">Academic</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Class Room</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary transition-colors shadow-sm cursor-pointer dark:text-slate-400">
            <Printer className="w-4 h-4" />
          </button>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-border text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer">
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-2">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as PDF</button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-foreground dark:text-slate-100 hover:bg-slate-50 flex items-center gap-3 cursor-pointer"><FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Export as Excel</button>
                </div>
              </>
            )}
          </div>
          <button onClick={openAddModal} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Add Class Room
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden text-left">
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50">
          <span className="text-[13px] text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredRooms.length}</span> rooms
          </span>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search room…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className={`overflow-x-auto ${actionMenuId ? 'pb-28' : ''}`}>
          <table className="w-full text-[13px]">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Room No</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Capacity</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700 dark:text-slate-200 w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filteredRooms.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-400">No rooms found. Add your first room!</td></tr>
              ) : filteredRooms.map(room => (
                <tr key={room._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-primary">{room.room_no}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{room.capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${room.is_active ? "bg-success/10 text-success" : "bg-[#FFEBEB] text-[#E02424]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${room.is_active ? "bg-success" : "bg-[#E02424]"}`} />
                      {room.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center relative" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setActionMenuId(actionMenuId === room._id ? null : room._id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === room._id ? "bg-primary text-white" : "hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuId === room._id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setActionMenuId(null); }} />
                        <div className="absolute right-10 top-10 w-36 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 overflow-hidden py-2 text-left">
                          <button onClick={() => openEditModal(room)} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium cursor-pointer">
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                          <button onClick={() => openDeleteModal(room)} className="w-full px-4 py-2 text-[13px] text-foreground dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2 font-medium cursor-pointer">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} title={isAddOpen ? "Add Class Room" : "Edit Class Room"}>
        <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-5 text-left">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Room No</label>
            <input type="text" value={formRoomNo} onChange={e => setFormRoomNo(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              placeholder="e.g. 101" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Capacity</label>
            <input type="number" value={formCapacity} onChange={e => setFormCapacity(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white dark:bg-slate-900 border border-border rounded-lg outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
              placeholder="e.g. 40" required />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-[14px] font-bold text-foreground dark:text-slate-100 block">Status</label>
              <span className="text-[13px] text-slate-500 block mt-1 dark:text-slate-400">Toggle to activate/deactivate</span>
            </div>
            <button type="button" onClick={() => setFormStatus(!formStatus)} className="cursor-pointer focus:outline-none">
              {formStatus
                ? <ToggleRight className="w-10 h-10 text-primary" />
                : <div className="w-10 h-10 flex items-center justify-center"><div className="w-8 h-4 bg-slate-300 rounded-full relative"><div className="w-3 h-3 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm dark:bg-slate-900" /></div></div>
              }
            </button>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
              className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[14px] font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-primary text-white text-[14px] font-bold rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm cursor-pointer">
              {isAddOpen ? "Add Room" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {isDeleteOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-full sm:w-[400px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] p-8 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground dark:text-slate-100 mb-3">Confirm Deletion</h2>
            <p className="text-[14px] text-slate-500 leading-relaxed mb-8 dark:text-slate-400">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDeleteOpen(false)} className="px-6 py-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 text-[14px] font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer dark:text-slate-200">Cancel</button>
              <button onClick={handleDeleteConfirm} className="px-6 py-2.5 bg-rose-500 text-white text-[14px] font-bold rounded-lg hover:bg-rose-600 transition-colors cursor-pointer">Yes, Delete</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
