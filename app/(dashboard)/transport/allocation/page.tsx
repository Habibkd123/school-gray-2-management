"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TransportTabs } from "../TransportTabs";
import { useAllocations, useRoutes, useBuses } from "../../../hooks/useTransport";
import { useStudents } from "../../../hooks/useStudents";
import { Modal } from "../../../components/ui/modal";
import {
  Search, Filter, ChevronDown, RefreshCw, Printer, Download,
  Plus, MoreVertical, Edit, Trash2, Loader2, ArrowUpDown,
  FileText, UserCheck, Bus, MapPin, User
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Allocation {
  id: string;
  studentName: string;
  studentId: string;
  admissionNo: string;
  className: string;
  route: string;
  busNumber: string;
  pickupStop: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

function getAvatar(name: string) {
  return name.toLowerCase().match(/^[a-m]/) ? "/asset 12.webp" : "/asset 14.webp";
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AllocationPage() {
  const router = useRouter();
  const { allocations, isLoading, error, addAllocation, updateAllocation, deleteAllocation, fetchAllocations } = useAllocations();
  const { routes } = useRoutes();
  const { buses } = useBuses();
  const { students } = useStudents();

  const dynamicRoutesMap = useMemo(() => {
    const map: Record<string, { bus: string; busId: string | null; stops: string[]; routeId: string }> = {};
    routes.forEach(r => {
      const b = buses.find(b => b.busNumber === r.assignedBus);
      map[r.routeName] = {
        bus: r.assignedBus,
        busId: b?.id || null,
        stops: r.stops.map((s: any) => s.name),
        routeId: r.id
      };
    });
    return map;
  }, [routes, buses]);

  const dynamicClasses = useMemo(() => Array.from(new Set(students.map(s => (typeof s.class_id === 'object' ? s.class_id?.name : "N/A")))), [students]);

  const [form, setForm] = useState({ student_id: "", route_id: "", bus_id: "", routeName: "", pickupStop: "", status: "Active" });
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterRoute, setFilterRoute] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Ascending");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modals
  const [viewAlloc, setViewAlloc] = useState<Allocation | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editAlloc, setEditAlloc] = useState<Allocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Allocation | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // When route changes, auto-fill bus and reset stop
  const handleRouteChange = (routeName: string) => {
    const info = dynamicRoutesMap[routeName];
    if (info) {
      setForm(f => ({ ...f, routeName, route_id: info.routeId, bus_id: info.busId || "", pickupStop: "" }));
    } else {
      setForm(f => ({ ...f, routeName: "", route_id: "", bus_id: "", pickupStop: "" }));
    }
  };

  const filtered = useMemo(() => {
    let list = allocations.filter(a => {
      const q = search.toLowerCase();
      const ms = a.studentName.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.admissionNo.toLowerCase().includes(q);
      const mClass = !filterClass || a.className === filterClass;
      const mRoute = !filterRoute || a.route === filterRoute;
      return ms && mClass && mRoute;
    });
    if (selectedSort === "Descending") list = [...list].reverse();
    return list;
  }, [allocations, search, filterClass, filterRoute, selectedSort]);

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      const res = await addAllocation(form);
      if (res.success) {
        setIsAddOpen(false);
        setForm({ student_id: "", route_id: "", bus_id: "", routeName: "", pickupStop: "", status: "Active" });
      } else {
        alert(res.error || "Failed to add allocation");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editAlloc) return;
    setIsSaving(true);
    try {
      const res = await updateAllocation(editAlloc.id, form);
      if (res.success) {
        setEditAlloc(null);
      } else {
        alert(res.error || "Failed to update allocation");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteAllocation(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
      } else {
        alert(res.error || "Failed to delete allocation");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (a: any) => {
    setEditAlloc(a);
    const mappedRoute = Object.values(dynamicRoutesMap).find(r => r.routeId === a.route_id);
    setForm({
      student_id: a.studentId,
      route_id: a.route_id || mappedRoute?.routeId || "",
      bus_id: a.bus_id || mappedRoute?.busId || "",
      routeName: a.route,
      pickupStop: a.pickupStop,
      status: a.status
    });
  };

  const triggerCls = (open: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors ${open ? "border-[#F59E0B] text-[#F59E0B]" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  const currentStops = dynamicRoutesMap[form.routeName]?.stops ?? [];

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen -m-6 p-6" onClick={() => setActiveDropdown(null)}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transport Management</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 mt-1">
            <span>Dashboard</span><span>/</span><span>Transport</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student Allocation</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchAllocations()} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm"><RefreshCw className="w-4 h-4" /></button>
          <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm"><Printer className="w-4 h-4" /></button>
          <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm">
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setForm({ student_id: "", route_id: "", bus_id: "", routeName: "", pickupStop: "", status: "Active" }); setIsAddOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Allocate Student
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TransportTabs />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Allocations", value: allocations.length, color: "bg-amber-50 dark:bg-amber-900/20 text-[#F59E0B]", icon: UserCheck },
          { label: "Active", value: allocations.filter(a => a.status === "Active").length, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600", icon: UserCheck },
          { label: "Inactive", value: allocations.filter(a => a.status === "Inactive").length, color: "bg-rose-50 dark:bg-rose-900/20 text-rose-500", icon: UserCheck },
          { label: "Routes Used", value: new Set(allocations.map(a => a.route)).size, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-500", icon: Bus },
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
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Student Allocations
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
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Class</label>
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none">
                          <option value="">All Classes</option>
                          {dynamicClasses.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Route</label>
                        <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none">
                          <option value="">All Routes</option>
                          {Object.keys(dynamicRoutesMap).map(r => <option key={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border flex justify-end gap-3">
                      <button onClick={() => { setFilterClass(""); setFilterRoute(""); }} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg">Reset</button>
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
            <input type="text" placeholder="Search student or ID..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-[#F59E0B]/50 transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[#0F172A] border-y border-border">
              <tr>
                <th className="px-4 py-4 text-left w-10"><input type="checkbox" className="rounded w-4 h-4 accent-[#F59E0B]" /></th>
                {["Alloc ID", "Student", "Class", "Route", "Bus Number", "Pickup Stop", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#F59E0B]" />
                  <p>Loading allocations...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No allocations found.</p>
                </td></tr>
              ) : filtered.map(alloc => (
                <tr key={alloc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-4"><input type="checkbox" className="rounded w-4 h-4 accent-[#F59E0B]" /></td>
                  <td className="px-4 py-4">
                    <button onClick={e => { e.stopPropagation(); setViewAlloc(alloc); }} className="font-semibold text-[#F59E0B] hover:underline">
                      {alloc._id?.slice(-6).toUpperCase() || alloc.id}
                    </button>
                  </td>
                  {/* Student name — click → /students/[id] */}
                  <td className="px-4 py-4">
                    <button onClick={e => { e.stopPropagation(); router.push(`/students/${alloc.studentId}`); }} className="flex items-center gap-3 group/sn">
                      <img src={getAvatar(alloc.studentName)} className="w-8 h-8 rounded-full object-cover border border-border" alt="" />
                      <div className="text-left">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover/sn:text-[#F59E0B] transition-colors">{alloc.studentName}</div>
                        <div className="text-[11px] text-slate-400">{alloc.admissionNo}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{alloc.className}</td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-[#92400E] dark:text-amber-300 text-[11px] font-semibold rounded">{alloc.route}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Bus className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-200">{alloc.busNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">{alloc.pickupStop}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold ${alloc.status === "Active" ? "bg-[#E8F8E8] text-[#1D7F2C]" : "bg-[#FFEBF0] text-[#FF4A6B]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${alloc.status === "Active" ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} />
                      {alloc.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setActiveDropdown(activeDropdown === alloc.id ? null : alloc.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F59E0B] hover:bg-[#D97706] text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === alloc.id && (
                        <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-lg z-50 py-2">
                          <button onClick={() => { setViewAlloc(alloc); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium">
                            <FileText className="w-4 h-4 text-slate-400" /> View Details
                          </button>
                          <button onClick={() => { openEdit(alloc); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium">
                            <Edit className="w-4 h-4 text-slate-400" /> Edit
                          </button>
                          <button onClick={() => { router.push(`/students/${alloc.studentId}`); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-3 font-medium">
                            <User className="w-4 h-4 text-slate-400" /> View Student
                          </button>
                          <button onClick={() => { setDeleteTarget(alloc); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left text-[13px] text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-medium">
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

      {/* ── VIEW DETAILS MODAL ── */}
      {viewAlloc && (
        <Modal isOpen={!!viewAlloc} onClose={() => setViewAlloc(null)} title="Allocation Details" size="md">
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
              <img src={getAvatar(viewAlloc.studentName)} className="w-14 h-14 rounded-xl object-cover border border-border shadow-sm" alt="" />
              <div className="flex-1">
                <button onClick={() => { setViewAlloc(null); router.push(`/students/${viewAlloc.studentId}`); }}
                  className="text-[16px] font-bold text-slate-900 dark:text-white hover:text-[#F59E0B] transition-colors text-left">
                  {viewAlloc.studentName}
                </button>
                <p className="text-[12px] text-slate-500">{viewAlloc.admissionNo} · {viewAlloc.className}</p>
                <p className="text-[12px] font-semibold text-[#F59E0B] mt-0.5">{viewAlloc.id}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${viewAlloc.status === "Active" ? "bg-[#E8F8E8] text-[#1D7F2C]" : "bg-[#FFEBF0] text-[#FF4A6B]"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${viewAlloc.status === "Active" ? "bg-[#1DD04A]" : "bg-[#FF4A6B]"}`} />
                {viewAlloc.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Route", value: viewAlloc.route, icon: Bus },
                { label: "Bus Number", value: viewAlloc.busNumber, icon: Bus },
                { label: "Pickup Stop", value: viewAlloc.pickupStop, icon: MapPin },
                { label: "Allocated On", value: viewAlloc.createdAt, icon: UserCheck },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
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
              <button onClick={() => { setViewAlloc(null); router.push(`/students/${viewAlloc.studentId}`); }}
                className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg hover:bg-[#E2E8F0] transition-colors flex items-center gap-2">
                <User className="w-4 h-4" /> View Student
              </button>
              <button onClick={() => setViewAlloc(null)} className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {(isAddOpen || !!editAlloc) && (
        <Modal isOpen={isAddOpen || !!editAlloc} onClose={() => { setIsAddOpen(false); setEditAlloc(null); }} title={editAlloc ? "Edit Allocation" : "Allocate Student"} size="md">
          <form onSubmit={e => { e.preventDefault(); editAlloc ? handleEdit() : handleAdd(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Student</label>
                <select required value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-[#F59E0B]/50 transition-all">
                  <option value="">Select a student...</option>
                  {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.admission_no})</option>)}
                </select>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Route</label>
                <select value={form.routeName} onChange={e => handleRouteChange(e.target.value)} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none">
                  <option value="">Select a route...</option>
                  {Object.keys(dynamicRoutesMap).map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Bus (auto-filled)</label>
                <input readOnly value={form.routeName ? dynamicRoutesMap[form.routeName]?.bus : ""} className="px-3.5 py-2.5 border border-border rounded-lg bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Pickup Stop</label>
                <select value={form.pickupStop} onChange={e => setForm(f => ({ ...f, pickupStop: e.target.value }))} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none">
                  <option value="">Select stop</option>
                  {currentStops.map((s: string) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none">
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setIsAddOpen(false); setEditAlloc(null); }} className="px-4 py-2 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 disabled:opacity-70 transition-colors">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editAlloc ? "Save Changes" : "Allocate"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Allocation" size="sm">
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto"><Trash2 className="w-7 h-7 text-rose-500" /></div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-[16px] mb-1">Remove {deleteTarget.id}?</h3>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">This will remove <strong>{deleteTarget.studentName}</strong>'s transport allocation.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[13px] font-semibold rounded-lg transition-colors">Remove</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
