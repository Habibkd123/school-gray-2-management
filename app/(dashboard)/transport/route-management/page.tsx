"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TransportTabs } from "../TransportTabs";
import { useRoutes, useBuses } from "../../../hooks/useTransport";
import { Modal } from "../../../components/ui/modal";
import {
  Search, Filter, ChevronDown, RefreshCw, Printer, Download,
  Plus, MoreVertical, Edit, Trash2, Loader2, ArrowUpDown,
  FileText, Map, MapPin, Bus, Clock, Navigation
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Stop { name: string; time: string; }

interface RouteRecord {
  id: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  stops: Stop[];
  assignedBus: string;
  morningTime: string;
  eveningTime: string;
  status: "Active" | "Inactive";
  totalStudents: number;
}

function buildEmptyRoute(): Omit<RouteRecord, "id" | "createdAt" | "_id"> {
  return {
    routeName: "", startPoint: "School Gate", endPoint: "",
    stops: [{ name: "School Gate", time: "06:30 AM" }],
    assignedBus: "Not Assigned", morningTime: "06:30 AM", eveningTime: "04:00 PM", status: "Active", totalStudents: 0,
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function RouteManagementPage() {
  const { routes, isLoading, error, addRoute, updateRoute, deleteRoute, fetchRoutes } = useRoutes();
  const { buses } = useBuses();
  
  // Extract dynamic bus names for the dropdown
  const dynamicBuses = useMemo(() => ["Not Assigned", ...buses.map(b => b.busNumber)], [buses]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBus, setFilterBus] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Ascending");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modals
  const [viewRoute, setViewRoute] = useState<RouteRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<RouteRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState(buildEmptyRoute());
  const [stopInput, setStopInput] = useState("");
  const setField = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() => {
    let list = routes.filter(r => {
      const q = search.toLowerCase();
      const ms = r.routeName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.startPoint.toLowerCase().includes(q) || r.endPoint.toLowerCase().includes(q);
      const mStatus = !filterStatus || r.status.toLowerCase() === filterStatus;
      const mBus = !filterBus || r.assignedBus === filterBus;
      return ms && mStatus && mBus;
    });
    if (selectedSort === "Descending") list = [...list].reverse();
    return list;
  }, [routes, search, filterStatus, filterBus, selectedSort]);

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      const res = await addRoute(form);
      if (res.success) {
        setIsAddOpen(false);
        setForm(buildEmptyRoute() as any);
      } else {
        alert(res.error || "Failed to add route");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editRoute) return;
    setIsSaving(true);
    try {
      const res = await updateRoute(editRoute.id, form);
      if (res.success) {
        setEditRoute(null);
      } else {
        alert(res.error || "Failed to update route");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteRoute(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
      } else {
        alert(res.error || "Failed to delete route");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (r: RouteRecord) => {
    setEditRoute(r);
    setForm({ routeName: r.routeName, startPoint: r.startPoint, endPoint: r.endPoint, stops: r.stops, assignedBus: r.assignedBus, morningTime: r.morningTime, eveningTime: r.eveningTime, status: r.status, totalStudents: r.totalStudents });
  };

  const addStop = () => {
    if (!stopInput.trim()) return;
    setForm(f => ({ ...f, stops: [...f.stops, { name: stopInput.trim(), time: "" }] }));
    setStopInput("");
  };

  const removeStop = (i: number) => setForm(f => ({ ...f, stops: f.stops.filter((_, idx) => idx !== i) }));

  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors ${open ? "border-[#F59E0B] text-[#F59E0B]" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6" onClick={() => setActiveDropdown(null)}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transport Management</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span><span>Transport</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Route Management</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchRoutes()} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm"><RefreshCw className="w-4 h-4" /></button>
          <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm"><Printer className="w-4 h-4" /></button>
          <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm">
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setForm(buildEmptyRoute() as any); setIsAddOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Route
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TransportTabs />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Routes", value: routes.length, color: "bg-amber-50 dark:bg-amber-900/20 text-[#F59E0B]", icon: Map },
          { label: "Active Routes", value: routes.filter(r => r.status === "Active").length, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600", icon: Navigation },
          { label: "Inactive Routes", value: routes.filter(r => r.status === "Inactive").length, color: "bg-rose-50 dark:bg-rose-900/20 text-rose-500", icon: Map },
          { label: "Total Stops", value: routes.reduce((s, r) => s + r.stops.length, 0), color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500", icon: MapPin },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
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
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Routes List
            <span className="ml-2 text-[13px] font-normal text-slate-400">({filtered.length})</span>
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
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
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Bus</label>
                        <select value={filterBus} onChange={e => setFilterBus(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none">
                          <option value="">All Buses</option>
                          {dynamicBuses.map(b => <option key={b}>{b}</option>)}
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
                      <button onClick={() => { setFilterStatus(""); setFilterBus(""); }} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg">Reset</button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg">Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>
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
                        className={`w-full px-4 py-2.5 text-left text-[13px] font-medium transition-colors ${item === selectedSort ? "bg-[#F59E0B] text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
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
            <div className="flex items-center gap-1 px-3 py-1.5 border border-border rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">10 <ChevronDown className="w-3.5 h-3.5" /></div>
            <span>Entries</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search route..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-4 py-4 text-left w-10"><input type="checkbox" className="rounded w-4 h-4 accent-[#F59E0B]" /></th>
                {["Route Name", "Start → End", "Stops", "Bus", "Morning", "Evening", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#F59E0B]" />
                  <p>Loading routes...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  <Map className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No routes found.</p>
                </td></tr>
              ) : filtered.map(route => (
                <tr key={route.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-4"><input type="checkbox" className="rounded w-4 h-4 accent-[#F59E0B]" /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setViewRoute(route); }}>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <Map className="w-4 h-4 text-[#F59E0B]" />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white group-hover:text-[#F59E0B] transition-colors">{route.routeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{route.startPoint}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-medium">{route.endPoint}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {route.stops.map((s: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded">
                          <MapPin className="w-2.5 h-2.5" /> {s.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Bus className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-200 font-medium text-[12px]">{route.assignedBus}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {route.morningTime}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {route.eveningTime}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold ${route.status === "Active" ? "bg-[#E8F8E8] text-[#1D7F2C]" : "bg-[#FFEBF0] text-[#FF4A6B]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${route.status === "Active" ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} />
                      {route.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setActiveDropdown(activeDropdown === route.id ? null : route.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F59E0B] hover:bg-[#D97706] text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === route.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 py-2">
                          <button onClick={() => { setViewRoute(route); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium">
                            <FileText className="w-4 h-4 text-slate-400" /> View Details
                          </button>
                          <button onClick={() => { openEdit(route); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium">
                            <Edit className="w-4 h-4 text-slate-400" /> Edit
                          </button>
                          <button onClick={() => { setDeleteTarget(route); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-medium">
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
            <button className="w-7 h-7 rounded bg-[#F59E0B] text-white text-[13px] font-bold">1</button>
            <button className="px-3 py-1.5 font-medium hover:text-slate-700 dark:hover:text-slate-200">Next</button>
          </div>
        </div>
      </div>

      {/* ── VIEW ROUTE MODAL — Stop Timeline ── */}
      {viewRoute && (
        <Modal isOpen={!!viewRoute} onClose={() => setViewRoute(null)} title="Route Details" size="md">
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                <Map className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-slate-500 font-semibold uppercase">Route Details</p>
                <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">{viewRoute.routeName}</h2>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${viewRoute.status === "Active" ? "bg-[#E8F8E8] text-[#1D7F2C]" : "bg-[#FFEBF0] text-[#FF4A6B]"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${viewRoute.status === "Active" ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} />
                {viewRoute.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Assigned Bus</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{viewRoute.assignedBus}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Total Students</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{viewRoute.totalStudents}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Morning Pickup</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{viewRoute.morningTime}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold uppercase mb-1">Evening Drop</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{viewRoute.eveningTime}</p>
              </div>
            </div>

            {/* Stop Timeline */}
            <div>
              <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-4">Stop Timeline</p>
              <div className="space-y-0">
                {viewRoute.stops.map((stop, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${i === 0 || i === viewRoute.stops.length - 1 ? "bg-[#F59E0B] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                        {i + 1}
                      </div>
                      {i < viewRoute.stops.length - 1 && <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-700 my-0.5" />}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-900 dark:text-white text-[13px]">{stop.name}</p>
                        {stop.time && <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{stop.time}</span>}
                      </div>
                      {i === 0 && <p className="text-[11px] text-[#F59E0B] font-semibold mt-0.5">Start Point</p>}
                      {i === viewRoute.stops.length - 1 && <p className="text-[11px] text-[#F59E0B] font-semibold mt-0.5">End Point</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setViewRoute(null); openEdit(viewRoute); }} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg flex items-center gap-2 hover:bg-[#E2E8F0] transition-colors">
                <Edit className="w-4 h-4" /> Edit Route
              </button>
              <button onClick={() => setViewRoute(null)} className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {(isAddOpen || !!editRoute) && (
        <Modal isOpen={isAddOpen || !!editRoute} onClose={() => { setIsAddOpen(false); setEditRoute(null); }} title={editRoute ? "Edit Route" : "Add Route"} size="md">
          <form onSubmit={e => { e.preventDefault(); editRoute ? handleEdit() : handleAdd(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Route Name</label>
                <input required value={form.routeName} onChange={e => setField("routeName", e.target.value)} placeholder="e.g. Route A – North"
                  className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-[#F59E0B]/50 transition-all" />
              </div>
              {[
                { label: "Start Point", key: "startPoint", placeholder: "e.g. School Gate" },
                { label: "End Point", key: "endPoint", placeholder: "e.g. North Market" },
                { label: "Morning Pickup Time", key: "morningTime", placeholder: "06:30 AM" },
                { label: "Evening Drop Time", key: "eveningTime", placeholder: "04:00 PM" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setField(key as any, e.target.value)} placeholder={placeholder}
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-[#F59E0B]/50 transition-all" />
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Assigned Bus</label>
              <select value={form.assignedBus} onChange={e => setField("assignedBus", e.target.value)} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none">
                {dynamicBuses.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            {/* Stops */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Stops</label>
              <div className="flex gap-2">
                <input value={stopInput} onChange={e => setStopInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addStop())} placeholder="Add stop name and press Enter"
                  className="flex-1 px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-[#F59E0B]/50 transition-all" />
                <button type="button" onClick={addStop} className="px-3 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg text-[13px] font-semibold transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.stops.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-[#92400E] dark:text-amber-300 text-[12px] font-semibold rounded">
                    <MapPin className="w-3 h-3" /> {s.name}
                    <button type="button" onClick={() => removeStop(i)} className="ml-0.5 text-slate-400 hover:text-rose-500">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Status</label>
              <select value={form.status} onChange={e => setField("status", e.target.value)} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none">
                <option>Active</option><option>Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setIsAddOpen(false); setEditRoute(null); }} className="px-4 py-2 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 disabled:opacity-70 transition-colors">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editRoute ? "Save Changes" : "Add Route"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Route" size="sm">
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto"><Trash2 className="w-7 h-7 text-rose-500" /></div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-[16px] mb-1">Delete {deleteTarget.id}?</h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">This will permanently remove <strong>{deleteTarget.routeName}</strong>.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[13px] font-semibold rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
