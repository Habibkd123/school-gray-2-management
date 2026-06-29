"use client";

import React, { useState, useMemo } from "react";
import { TransportTabs } from "../TransportTabs";
import { useBuses, useRoutes } from "../../../hooks/useTransport";
import { Modal } from "../../../components/ui/modal";
import {
  Search, Filter, ChevronDown, RefreshCw, Printer, Download,
  Plus, MoreVertical, Edit, Trash2, Loader2, ArrowUpDown,
  FileText, Bus, User, Phone, Hash, Users, Gauge
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface BusRecord {
  id: string;
  busNumber: string;
  busModel: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  assignedRoute: string;
  status: "Active" | "Inactive";
  registrationNo: string;
  createdAt: string;
}

function buildEmptyBus(): Omit<BusRecord, "id" | "createdAt" | "_id"> {
  return { busNumber: "", busModel: "", driverName: "", driverPhone: "", capacity: 40, assignedRoute: "", status: "Active", registrationNo: "" };
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function BusDetailsPage() {
  const { buses, isLoading, error, addBus, updateBus, deleteBus, fetchBuses } = useBuses();
  const { routes } = useRoutes();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRoute, setFilterRoute] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Ascending");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modals
  const [viewBus, setViewBus] = useState<BusRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBus, setEditBus] = useState<BusRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form
  const [form, setForm] = useState(buildEmptyBus());
  const setField = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  // Filtered
  const filtered = useMemo(() => {
    let list = buses.filter(b => {
      const q = search.toLowerCase();
      const ms = b.busNumber.toLowerCase().includes(q) || b.driverName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
      const mStatus = !filterStatus || b.status.toLowerCase() === filterStatus;
      const mRoute = !filterRoute || b.assignedRoute === filterRoute;
      return ms && mStatus && mRoute;
    });
    if (selectedSort === "Descending") list = [...list].reverse();
    return list;
  }, [buses, search, filterStatus, filterRoute, selectedSort]);

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      const res = await addBus(form);
      if (res.success) {
        setIsAddOpen(false);
        setForm(buildEmptyBus() as any);
      } else {
        alert(res.error || "Failed to add bus");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editBus) return;
    setIsSaving(true);
    try {
      const res = await updateBus(editBus.id, form);
      if (res.success) {
        setEditBus(null);
      } else {
        alert(res.error || "Failed to update bus");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteBus(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
      } else {
        alert(res.error || "Failed to delete bus");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (b: BusRecord) => {
    setEditBus(b);
    setForm({ busNumber: b.busNumber, busModel: b.busModel, driverName: b.driverName, driverPhone: b.driverPhone, capacity: b.capacity, assignedRoute: b.assignedRoute, status: b.status, registrationNo: b.registrationNo });
  };

  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors ${open ? "border-primary text-primary" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  // Field builder for modals
  const FieldInput = ({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) => (
    <div className="flex flex-col gap-1.5 text-left">
      <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm" />
    </div>
  );

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6" onClick={() => setActiveDropdown(null)}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transport Management</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span><span>Transport</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Bus Details</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchBuses()} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm"><RefreshCw className="w-4 h-4" /></button>
          <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm"><Printer className="w-4 h-4" /></button>
          <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm">
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setForm(buildEmptyBus() as any); setIsAddOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Bus
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TransportTabs />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Buses", value: buses.length, icon: Bus, color: "bg-amber-50 dark:bg-amber-900/20 text-primary" },
          { label: "Active", value: buses.filter(b => b.status === "Active").length, icon: Gauge, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" },
          { label: "Inactive", value: buses.filter(b => b.status === "Inactive").length, icon: Bus, color: "bg-rose-50 dark:bg-rose-900/20 text-rose-500" },
          { label: "Total Capacity", value: buses.reduce((s, b) => s + b.capacity, 0), icon: Users, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
              <p className="text-[22px] font-bold text-slate-900 dark:text-white leading-none mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Bus List
            <span className="ml-2 text-[13px] font-normal text-slate-400">({filtered.length})</span>
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={triggerCls(isFilterOpen)}>
                <Filter className="w-4 h-4" /> Filter <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-xl z-50">
                    <div className="p-4 border-b border-border font-bold text-[15px] text-slate-900 dark:text-white">Filter</div>
                    <div className="p-4 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Route</label>
                        <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none">
                          <option value="">All Routes</option>
                          {routes.map((r: any) => <option key={r.id} value={r.routeName}>{r.routeName}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none">
                          <option value="">All</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border flex justify-end gap-3">
                      <button onClick={() => { setFilterStatus(""); setFilterRoute(""); }} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg">Reset</button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg">Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Sort */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsSortOpen(!isSortOpen)} className={triggerCls(isSortOpen)}>
                <ArrowUpDown className="w-4 h-4" /> Sort <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-lg z-50 py-1.5">
                    {["Ascending", "Descending"].map(item => (
                      <button key={item} onClick={() => { setSelectedSort(item); setIsSortOpen(false); }}
                        className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${item === selectedSort ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Row */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 text-[13px] text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>Row Per Page</span>
            <div className="flex items-center gap-1 px-3 py-1.5 border border-border rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">
              10 <ChevronDown className="w-3.5 h-3.5" />
            </div>
            <span>Entries</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search bus or driver..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className={`overflow-x-auto ${activeDropdown ? "pb-28" : ""}`}>
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-4 py-4 text-left w-10"><input type="checkbox" className="rounded w-4 h-4 accent-primary" /></th>
                {["Bus Number", "Driver", "Phone", "Capacity", "Assigned Route", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                  <p>Loading buses...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <Bus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No buses found.</p>
                </td></tr>
              ) : filtered.map((bus, idx) => (
                <tr key={bus.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-4"><input type="checkbox" className="rounded w-4 h-4 accent-primary" /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setViewBus(bus); }}>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <Bus className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{bus.busNumber}</div>
                        <div className="text-[11px] text-slate-400">{bus.busModel}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">{bus.driverName}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{bus.driverPhone}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{bus.capacity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300 max-w-full sm:w-[160px] truncate">{bus.assignedRoute}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold ${bus.status === "Active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${bus.status === "Active" ? "bg-success" : "bg-danger"}`} />
                      {bus.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setActiveDropdown(activeDropdown === bus.id ? null : bus.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-primary hover:bg-[var(--primary-hover)] text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === bus.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 py-2">
                          <button onClick={() => { setViewBus(bus); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium">
                            <FileText className="w-4 h-4 text-slate-400" /> View Details
                          </button>
                          <button onClick={() => { openEdit(bus); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium">
                            <Edit className="w-4 h-4 text-slate-400" /> Edit
                          </button>
                          <button onClick={() => { setDeleteTarget(bus); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-medium">
                            <Trash2 className="w-4 h-4 text-rose-400" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between text-[13px] text-slate-500">
          <span>Showing 1–{Math.min(10, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 font-medium hover:text-slate-700 dark:hover:text-slate-200">Prev</button>
            <button className="w-7 h-7 rounded bg-primary text-white text-[13px] font-bold">1</button>
            <button className="px-3 py-1.5 font-medium hover:text-slate-700 dark:hover:text-slate-200">Next</button>
          </div>
        </div>
      </div>

      {/* ── VIEW DETAILS MODAL ── */}
      {viewBus && (
        <Modal isOpen={!!viewBus} onClose={() => setViewBus(null)} title="Bus Details" size="md">
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bus className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Bus</p>
                <h2 className="text-[18px] font-bold text-primary">{viewBus.busNumber}</h2>
                <p className="text-[13px] text-slate-500">{viewBus.busModel}</p>
              </div>
              <span className={`ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${viewBus.status === "Active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${viewBus.status === "Active" ? "bg-success" : "bg-danger"}`} />
                {viewBus.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Bus Number", value: viewBus.busNumber, icon: Hash },
                { label: "Registration No", value: viewBus.registrationNo, icon: FileText },
                { label: "Driver Name", value: viewBus.driverName, icon: User },
                { label: "Driver Phone", value: viewBus.driverPhone, icon: Phone },
                { label: "Capacity", value: `${viewBus.capacity} seats`, icon: Users },
                { label: "Assigned Route", value: viewBus.assignedRoute, icon: Bus },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase mb-0.5">{label}</p>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setViewBus(null); openEdit(viewBus); }} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-[#E2E8F0] transition-colors flex items-center gap-2">
                <Edit className="w-4 h-4" /> Edit Bus
              </button>
              <button onClick={() => setViewBus(null)} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {(isAddOpen || !!editBus) && (
        <Modal isOpen={isAddOpen || !!editBus} onClose={() => { setIsAddOpen(false); setEditBus(null); }} title={editBus ? "Edit Bus" : "Add Bus"} size="md">
          <form onSubmit={e => { e.preventDefault(); editBus ? handleEdit() : handleAdd(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldInput label="Bus Number" value={form.busNumber} onChange={v => setField("busNumber", v)} placeholder="e.g. KA-01-AB-1234" />
              <FieldInput label="Registration No" value={form.registrationNo} onChange={v => setField("registrationNo", v)} placeholder="e.g. KA01AB1234" />
              <FieldInput label="Model" value={form.busModel} onChange={v => setField("busModel", v)} placeholder="e.g. Tata Starbus" />
              <FieldInput label="Capacity (seats)" value={form.capacity} onChange={v => setField("capacity", parseInt(v) || 0)} type="number" placeholder="40" />
              <FieldInput label="Driver Name" value={form.driverName} onChange={v => setField("driverName", v)} placeholder="e.g. Ramesh Kumar" />
              <FieldInput label="Driver Phone" value={form.driverPhone} onChange={v => setField("driverPhone", v)} placeholder="+91 98765 43210" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Assigned Route</label>
              <select value={form.assignedRoute} onChange={e => setField("assignedRoute", e.target.value)} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none">
                <option value="">Select a route...</option>
                {routes.map((r: any) => <option key={r.id} value={r.routeName}>{r.routeName}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Status</label>
              <select value={form.status} onChange={e => setField("status", e.target.value)} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none">
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setIsAddOpen(false); setEditBus(null); }} className="px-4 py-2 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 disabled:opacity-70 transition-colors">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editBus ? "Save Changes" : "Add Bus"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Bus" size="sm">
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7 text-rose-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-[16px] mb-1">Delete {deleteTarget.id}?</h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">This will permanently remove <strong>{deleteTarget.busNumber}</strong> from the system.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-200">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[13px] font-semibold rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
