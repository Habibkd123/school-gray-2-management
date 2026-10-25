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
  FileText, UserCheck, Bus, MapPin, User, Check, Users, Eye
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
  const { students, fetchStudents } = useStudents({ skip: true });

  useEffect(() => {
    fetchStudents({ limit: 500 });
  }, [fetchStudents]);

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
  const [allocationMode, setAllocationMode] = useState<"single" | "multiple">("single");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [modalStudentSearch, setModalStudentSearch] = useState("");
  const [modalClassFilter, setModalClassFilter] = useState("");
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

  // Filtered students for multiple selection in modal
  const modalFilteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = modalStudentSearch.toLowerCase().trim();
      const matchQuery = !q || s.name?.toLowerCase().includes(q) || s.admission_no?.toLowerCase().includes(q);
      const studentClassName = typeof s.class_id === "object" ? s.class_id?.name : "";
      const matchClass = !modalClassFilter || studentClassName === modalClassFilter;
      return matchQuery && matchClass;
    });
  }, [students, modalStudentSearch, modalClassFilter]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = modalFilteredStudents.map(s => s._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
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
    if (!form.routeName) {
      alert("Please select a route.");
      return;
    }

    if (allocationMode === "single" && !form.student_id) {
      alert("Please select a student.");
      return;
    }

    if (allocationMode === "multiple" && selectedStudentIds.length === 0) {
      alert("Please select at least one student.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = allocationMode === "multiple"
        ? {
          student_ids: selectedStudentIds,
          route_id: form.route_id,
          bus_id: form.bus_id,
          pickupStop: form.pickupStop,
          status: form.status,
        }
        : form;

      const res = await addAllocation(payload);
      if (res.success) {
        setIsAddOpen(false);
        setForm({ student_id: "", route_id: "", bus_id: "", routeName: "", pickupStop: "", status: "Active" });
        setSelectedStudentIds([]);
        setModalStudentSearch("");
        setModalClassFilter("");
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
    `flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[13px] font-medium bg-white dark:bg-slate-900 shadow-sm transition-colors ${open ? "border-primary text-primary" : "border-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`;

  const currentStops = dynamicRoutesMap[form.routeName]?.stops ?? [];

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6" onClick={() => setActiveDropdown(null)}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transport Management</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span><span>/</span><span>Transport</span><span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Student Allocation</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchAllocations()} className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm dark:text-slate-400"><RefreshCw className="w-4 h-4" /></button>
          {/* <button className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm dark:text-slate-400"><Printer className="w-4 h-4" /></button> */}
          <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm">
            <Download className="w-4 h-4" /> Export <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => {
            setForm({ student_id: "", route_id: "", bus_id: "", routeName: "", pickupStop: "", status: "Active" });
            setAllocationMode("single");
            setSelectedStudentIds([]);
            setModalStudentSearch("");
            setModalClassFilter("");
            setIsAddOpen(true);
          }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Allocate Student
          </button>
        </div>
      </div>

      {/* Tabs */}
      <TransportTabs />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Allocations", value: allocations.length, color: "bg-amber-50 dark:bg-amber-900/20 text-primary", icon: UserCheck },
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
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-2xl z-50">
                    <div className="p-4 border-b border-border font-bold text-[15px] text-slate-900 dark:text-white">Filter</div>
                    <div className="p-4 space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Class</label>
                        <div className="relative">
                          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full pl-3 pr-8 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer">
                            <option value="">All Classes</option>
                            {dynamicClasses.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Route</label>
                        <div className="relative">
                          <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="w-full pl-3 pr-8 py-2 border border-border rounded-lg text-[13px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer">
                            <option value="">All Routes</option>
                            {Object.keys(dynamicRoutesMap).map(r => <option key={r}>{r}</option>)}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-t border-border flex justify-end gap-3">
                      <button onClick={() => { setFilterClass(""); setFilterRoute(""); }} className="px-4 py-2 bg-[#F1F5F9] dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[13px] font-semibold rounded-lg cursor-pointer">Reset</button>
                      <button onClick={() => setIsFilterOpen(false)} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg cursor-pointer">Apply</button>
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
        <div className="card-subtitle p-4 border-b border-border flex items-center justify-between gap-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span>Row Per Page</span>
            <div className="flex items-center gap-1 px-3 py-1.5 border border-border rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer">10 <ChevronDown className="w-3.5 h-3.5" /></div>
            <span>Entries</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search student or ID..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-[240px] bg-white dark:bg-slate-900 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50 transition-all" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="erp-table text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] border-y border-border">
              <tr>
                <th className="px-4 py-4 text-left w-10"><input type="checkbox" className="rounded w-4 h-4 accent-primary" /></th>
                {["Alloc ID", "Student", "Class", "Route", "Bus Number", "Pickup Stop", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-4 text-left font-bold text-slate-700 dark:text-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                  <p>Loading allocations...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No allocations found.</p>
                </td></tr>
              ) : filtered.map(alloc => (
                <tr key={alloc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-4"><input type="checkbox" className="rounded w-4 h-4 accent-primary" /></td>
                  <td className="px-4 py-4">
                    <button onClick={e => { e.stopPropagation(); setViewAlloc(alloc); }} className="font-semibold text-primary hover:underline">
                      {alloc._id?.slice(-6).toUpperCase() || alloc.id}
                    </button>
                  </td>
                  {/* Student name — click → /students/[id] */}
                  <td className="px-4 py-4">
                    <button onClick={e => { e.stopPropagation(); router.push(`/students/${alloc.studentId}`); }} className="flex items-center gap-3 group/sn">
                      <img src={getAvatar(alloc.studentName)} className="w-8 h-8 rounded-full object-cover border border-border" alt="" />
                      <div className="text-left">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover/sn:text-primary transition-colors">{alloc.studentName}</div>
                        <div className="text-[11px] text-slate-400">{alloc.admissionNo}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{alloc.className}</td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 bg-primary/10 dark:bg-primary/20 text-[var(--primary-hover)] dark:text-amber-300 text-[11px] font-semibold rounded">{alloc.route}</span>
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
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold ${alloc.status === "Active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${alloc.status === "Active" ? "bg-success" : "bg-danger"}`} />
                      {alloc.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setViewAlloc(alloc)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(alloc)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Edit Allocation"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(alloc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                        title="Delete Allocation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-subtitle p-4 border-t border-border flex items-center justify-between text-[13px]">
          <span>Showing 1–{Math.min(10, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 font-medium hover:text-slate-700 dark:hover:text-slate-200">Prev</button>
            <button className="w-7 h-7 rounded bg-primary text-white text-[13px] font-bold">1</button>
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
                  className="text-[16px] font-bold text-slate-900 dark:text-white hover:text-primary transition-colors text-left">
                  {viewAlloc.studentName}
                </button>
                <p className="text-[12px] text-slate-500 dark:text-slate-400">{viewAlloc.admissionNo} · {viewAlloc.className}</p>
                <p className="text-[12px] font-semibold text-primary mt-0.5">{viewAlloc.id}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${viewAlloc.status === "Active" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${viewAlloc.status === "Active" ? "bg-success" : "bg-danger"}`} />
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
                    <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
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
              <button onClick={() => setViewAlloc(null)} className="px-4 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {(isAddOpen || !!editAlloc) && (
        <Modal
          isOpen={isAddOpen || !!editAlloc}
          onClose={() => { setIsAddOpen(false); setEditAlloc(null); }}
          title={editAlloc ? "Edit Allocation" : (allocationMode === "multiple" ? "Allocate Multiple Students" : "Allocate Student")}
          size={allocationMode === "multiple" && !editAlloc ? "lg" : "md"}
        >
          <form onSubmit={e => { e.preventDefault(); editAlloc ? handleEdit() : handleAdd(); }} className="space-y-4">

            {/* Mode Selector (Only during Add) */}
            {!editAlloc && (
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAllocationMode("single")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-bold rounded-md transition-all ${allocationMode === "single"
                      ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Single Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationMode("multiple")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-bold rounded-md transition-all ${allocationMode === "multiple"
                      ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Multiple Students ({selectedStudentIds.length})</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Single Student Selection */}
              {(editAlloc || allocationMode === "single") ? (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Student</label>
                  <select
                    required
                    value={form.student_id}
                    onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                    className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="">Select a student...</option>
                    {students.map(s => {
                      const cName = typeof s.class_id === 'object' ? s.class_id?.name : "";
                      return (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.admission_no || "No Adm"}) {cName ? `• ${cName}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                /* Multiple Students Selection */
                <div className="col-span-2 flex flex-col gap-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                      Select Students ({selectedStudentIds.length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAllVisible}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      {modalFilteredStudents.length > 0 && modalFilteredStudents.every(s => selectedStudentIds.includes(s._id))
                        ? "Deselect Filtered"
                        : "Select All Filtered"}
                    </button>
                  </div>

                  {/* Search and Class Filter inside Modal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search student or admission no..."
                        value={modalStudentSearch}
                        onChange={e => setModalStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-[12px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <select
                        value={modalClassFilter}
                        onChange={e => setModalClassFilter(e.target.value)}
                        className="w-full px-3 py-1.5 border border-border rounded-lg text-[12px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-primary/50"
                      >
                        <option value="">All Classes</option>
                        {dynamicClasses.filter(c => c && c !== "N/A").map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Student Checklist */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-border rounded-lg bg-white dark:bg-slate-900 p-2 divide-y divide-slate-100 dark:divide-slate-800">
                    {modalFilteredStudents.length === 0 ? (
                      <div className="py-6 text-center text-[12px] text-slate-400">
                        No students match the search/filter criteria.
                      </div>
                    ) : (
                      modalFilteredStudents.map(s => {
                        const isChecked = selectedStudentIds.includes(s._id);
                        const cName = typeof s.class_id === 'object' ? s.class_id?.name : "";
                        return (
                          <label
                            key={s._id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-[12px] ${isChecked
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectStudent(s._id)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                              />
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">{s.name}</span>
                                <span className="text-slate-400 text-[11px] ml-1.5">({s.admission_no || "No Adm"})</span>
                              </div>
                            </div>
                            {cName && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {cName}
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Route */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Route</label>
                <select required value={form.routeName} onChange={e => handleRouteChange(e.target.value)} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                  <option value="">Select a route...</option>
                  {Object.keys(dynamicRoutesMap).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Bus (Auto-filled) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Bus (auto-filled)</label>
                <input readOnly value={form.routeName ? dynamicRoutesMap[form.routeName]?.bus : ""} className="px-3.5 py-2.5 border border-border rounded-lg bg-slate-50 dark:bg-slate-800 text-[13px] text-slate-600 dark:text-slate-300 outline-none cursor-not-allowed" />
              </div>

              {/* Pickup Stop */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Pickup Stop</label>
                <select value={form.pickupStop} onChange={e => setForm(f => ({ ...f, pickupStop: e.target.value }))} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                  <option value="">Select stop</option>
                  {currentStops.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Status */}
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="px-3.5 py-2.5 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-white outline-none focus:border-primary/50 cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
              <button type="button" onClick={() => { setIsAddOpen(false); setEditAlloc(null); }} className="px-4 py-2 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-200">Cancel</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-primary hover:bg-[var(--primary-hover)] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 disabled:opacity-70 transition-colors">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editAlloc
                  ? "Save Changes"
                  : allocationMode === "multiple"
                    ? `Allocate ${selectedStudentIds.length} Student${selectedStudentIds.length === 1 ? "" : "s"}`
                    : "Allocate Student"}
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
              <h3 className="font-bold text-slate-900 dark:text-white text-[16px] mb-1">Remove {deleteTarget.studentName}&apos;s Allocation?</h3>
              <p className="card-subtitle text-[13px]">This will remove <strong>{deleteTarget.studentName}</strong>&apos;s transport allocation.</p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-border text-[13px] font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 transition-colors dark:text-slate-200">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-[13px] font-semibold rounded-lg transition-colors">Remove</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
