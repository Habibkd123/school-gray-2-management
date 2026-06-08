"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search, List, Grid, MoreVertical, Edit, Trash2, Plus,
  Calendar, Filter, ChevronDown, RefreshCw, Printer, Download, FileText
} from "lucide-react";
import { Modal } from "../../../components/ui/modal";

interface FeesType {
  id: string; // Database ID
  displayId: string;
  feesType: string;
  feesCode: string;
  feesGroup: string;
  description: string;
  status: "Active" | "Inactive";
}

const mockFeesTypeData: FeesType[] = [
  { id: "1", displayId: "FG80482", feesType: "Admission Fees", feesCode: "Admission-Fees", feesGroup: "Tuition Fees", description: "The money that you pay to be taught", status: "Active" },
  { id: "2", displayId: "FG80481", feesType: "Apr-Mar", feesCode: "Apr-Mar", feesGroup: "Monthly Fees", description: "The money that you pay to be taught", status: "Active" },
  { id: "3", displayId: "FG80480", feesType: "Bus Fees", feesCode: "Bus Fees", feesGroup: "Class 1 General", description: "The money that you pay to be taught", status: "Active" },
  { id: "4", displayId: "FG80479", feesType: "1st Installment Fees", feesCode: "1st-Installment-Fees", feesGroup: "Class 1 Lump Sum", description: "The money that you pay to be taught", status: "Active" },
  { id: "5", displayId: "FG80478", feesType: "2nd Installment Fees", feesCode: "2nd-Installment-Fees", feesGroup: "Class 1-I Installment", description: "The money that you pay to be taught", status: "Inactive" },
  { id: "6", displayId: "FG80477", feesType: "3rd Installment Fees", feesCode: "3rd-Installment-Fees", feesGroup: "Class 1-II Installment", description: "The money that you pay to be taught", status: "Active" },
  { id: "7", displayId: "FG80476", feesType: "4th Installment Fees", feesCode: "4th-Installment-Fees", feesGroup: "Class 1-III Installment", description: "The money that you pay to be taught", status: "Active" },
  { id: "8", displayId: "FG80475", feesType: "Topper Discount", feesCode: "Topper-Discount", feesGroup: "Discount", description: "The money that you pay to be taught", status: "Inactive" },
];

export default function FeesTypePage() {
  const [feesTypeData, setFeesTypeData] = useState<FeesType[]>(mockFeesTypeData);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedType, setSelectedType] = useState<FeesType | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formFeesGroup, setFormFeesGroup] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  // Filter States
  const [filterId, setFilterId] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterFeesGroup, setFilterFeesGroup] = useState("");
  const [filterFeesType, setFilterFeesType] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");

  const openAddModal = () => {
    setFormName("");
    setFormFeesGroup("");
    setFormDescription("");
    setFormStatus("Active");
    setIsAddOpen(true);
  };

  const openEditModal = (item: FeesType) => {
    setSelectedType(item);
    setFormName(item.feesType);
    setFormFeesGroup(item.feesGroup);
    setFormDescription(item.description);
    setFormStatus(item.status);
    setIsEditOpen(true);
    setActionMenuId(null);
  };

  const openDeleteModal = (item: FeesType) => {
    setSelectedType(item);
    setIsDeleteOpen(true);
    setActionMenuId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: FeesType = {
      id: Math.random().toString(),
      displayId: `FG80${Math.floor(100 + Math.random() * 900)}`,
      feesType: formName,
      feesCode: formName.replace(/\s+/g, '-'),
      feesGroup: formFeesGroup || "General",
      description: formDescription,
      status: formStatus,
    };
    setFeesTypeData([newItem, ...feesTypeData]);
    setIsAddOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType) {
      setFeesTypeData(feesTypeData.map(s => 
        s.id === selectedType.id 
          ? { 
              ...s, 
              feesType: formName, 
              feesCode: formName.replace(/\s+/g, '-'), 
              feesGroup: formFeesGroup, 
              description: formDescription, 
              status: formStatus 
            }
          : s
      ));
    }
    setIsEditOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (selectedType) {
      setFeesTypeData(feesTypeData.filter(s => s.id !== selectedType.id));
    }
    setIsDeleteOpen(false);
  };

  const filteredData = feesTypeData.filter(s => 
    s.feesType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.feesGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 bg-[#F8FAFC] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fees Collection</h1>
          <div className="flex items-center gap-2 text-[13px] text-slate-500 mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href="/dashboard/fees-collection" className="hover:text-[#5D6BEE]">Fees Collection</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Fees Type</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center text-slate-500 hover:text-[#5D6BEE] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center text-slate-500 hover:text-[#5D6BEE] hover:bg-indigo-50 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2 bg-white border border-border text-slate-700 text-[13px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isExportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden py-2 text-left">
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#202c4b] hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500" /> Export as PDF
                  </button>
                  <button className="w-full px-4 py-2.5 text-[14px] font-medium text-[#202c4b] hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-500" /> Export as Excel
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-[#5D6BEE] hover:bg-[#4b58ce] text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Fees Type
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden text-left">
        {/* Table Header Section */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-slate-800">Fees Collection</h2>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="px-3 py-2 bg-white border border-border text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-400" /> 06/02/2026 - 06/08/2026
              </button>
              {isDateRangeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateRangeOpen(false)} />
                  <div className="absolute right-0 sm:left-0 top-full mt-2 w-44 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Year", "Next Year", "Custom Range"].map((item) => (
                      <button key={item} className={`w-full px-4 py-2 text-[13px] text-left transition-colors cursor-pointer ${item === "Last 7 Days" ? "bg-[#5D6BEE] text-white font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-3 py-2 bg-white border border-border text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Filter className="w-4 h-4 text-slate-400" /> Filter <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-[420px] bg-white border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 text-left">
                    <div className="p-4 border-b border-border">
                      <h3 className="text-[15px] font-bold text-[#202c4b]">Filter</h3>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800">ID</label>
                          <div className="relative">
                            <select 
                              value={filterId}
                              onChange={(e) => setFilterId(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white text-slate-600 font-medium cursor-pointer"
                            >
                              <option value="">Select</option>
                              <option value="FG80482">FG80482</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800">Name</label>
                          <div className="relative">
                            <select 
                              value={filterName}
                              onChange={(e) => setFilterName(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white text-slate-600 font-medium cursor-pointer"
                            >
                              <option value="">Select Name</option>
                              <option value="Admission Fees">Admission Fees</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800">Fees Group</label>
                          <div className="relative">
                            <select 
                              value={filterFeesGroup}
                              onChange={(e) => setFilterFeesGroup(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white text-slate-600 font-medium cursor-pointer"
                            >
                              <option value="">Select Fees Group</option>
                              <option value="Tuition Fees">Tuition Fees</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-800">Fees Type</label>
                          <div className="relative">
                            <select 
                              value={filterFeesType}
                              onChange={(e) => setFilterFeesType(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white text-slate-600 font-medium cursor-pointer"
                            >
                              <option value="">Select Fees Type</option>
                              <option value="Admission Fees">Admission Fees</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-800">Status</label>
                        <div className="relative">
                          <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none appearance-none bg-white text-slate-600 font-medium cursor-pointer"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-end gap-3 bg-white rounded-b-lg border-t border-border mt-2">
                      <button 
                        onClick={() => { setFilterId(""); setFilterName(""); setFilterFeesGroup(""); setFilterFeesType(""); setFilterStatus("Active"); }}
                        className="px-5 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#202c4b] text-[13px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => setIsFilterOpen(false)}
                        className="px-5 py-2.5 bg-[#5D6BEE] hover:bg-[#4b58ce] text-white text-[13px] font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="px-3 py-2 bg-white border border-border text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <List className="w-4 h-4 text-slate-400" /> Sort by A-Z <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1.5 text-left">
                    {["Ascending", "Descending", "Recently Viewed", "Recently Added"].map((item) => (
                      <button key={item} className="w-full px-4 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 text-left transition-colors font-medium cursor-pointer">
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            <span>Row Per Page</span>
            <select className="px-2 py-1.5 bg-white border border-border rounded-lg outline-none text-slate-700 font-medium cursor-pointer">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <span>Entries</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-[240px] bg-white border border-border rounded-lg text-[13px] outline-none focus:border-[#5D6BEE] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] whitespace-nowrap">
            <thead className="bg-[#F8FAFC] border-y border-border">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-700 w-12">
                  <input type="checkbox" className="rounded border-slate-300 text-[#5D6BEE] focus:ring-[#5D6BEE] cursor-pointer" />
                </th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">ID</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">Fees Type</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">Fees Code</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">Fees Group</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">Description</th>
                <th className="px-6 py-4 text-left font-bold text-slate-700">Status</th>
                <th className="px-6 py-4 text-center font-bold text-slate-700 w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="rounded border-slate-300 text-[#5D6BEE] focus:ring-[#5D6BEE] cursor-pointer" />
                  </td>
                  <td className="px-6 py-4">
                    <button className="font-semibold text-[#5D6BEE] hover:text-[#4b58ce] transition-colors cursor-pointer">
                      {item.displayId}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {item.feesType}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {item.feesCode}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {item.feesGroup}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {item.description}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${actionMenuId === item.id ? "bg-[#5D6BEE] text-white" : "hover:bg-slate-100 text-slate-400"}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {actionMenuId === item.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setActionMenuId(null); }} />
                        <div className="absolute right-10 top-10 w-36 bg-white border border-border rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden py-2 text-left">
                          <button onClick={() => openEditModal(item)} className="w-full px-4 py-2 text-[13px] text-[#202c4b] hover:bg-slate-50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                            <Edit className="w-4 h-4 text-[#202c4b]" /> Edit
                          </button>
                          <button onClick={() => openDeleteModal(item)} className="w-full px-4 py-2 text-[13px] text-[#202c4b] hover:bg-slate-50 flex items-center gap-2 font-medium transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4 text-[#202c4b]" /> Delete
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

        {/* Pagination */}
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors">Prev</button>
          <button className="w-7 h-7 rounded-lg bg-[#5D6BEE] text-white text-[13px] font-medium flex items-center justify-center">1</button>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600 text-[13px] font-medium flex items-center justify-center transition-colors">2</button>
          <button className="px-3 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors">Next</button>
        </div>
      </div>

      {/* Add / Edit Modals */}
      <Modal isOpen={isAddOpen || isEditOpen} onClose={() => { setIsAddOpen(false); setIsEditOpen(false); }} title={isAddOpen ? "Add Fees Type" : "Edit Fees Type"}>
        <form onSubmit={isAddOpen ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-5 text-left">
          
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800">Name</label>
            <input 
              type="text"
              placeholder={isEditOpen ? "Enter Name" : ""}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white border border-border rounded-lg outline-none focus:border-[#5D6BEE] transition-colors text-slate-700"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-slate-800">Fees Group</label>
              <button type="button" className="text-[13px] font-bold text-[#5D6BEE] hover:text-[#4b58ce] flex items-center gap-1 transition-colors cursor-pointer">
                <Plus className="w-3 h-3" /> Add New
              </button>
            </div>
            <div className="relative">
              <select 
                value={formFeesGroup}
                onChange={(e) => setFormFeesGroup(e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] bg-white border border-border rounded-lg outline-none focus:border-[#5D6BEE] transition-colors text-slate-700 appearance-none cursor-pointer"
                required
              >
                <option value="">Select</option>
                <option value="Tuition Fees">Tuition Fees</option>
                <option value="Monthly Fees">Monthly Fees</option>
                <option value="Class 1 General">Class 1 General</option>
                <option value="Class 1 Lump Sum">Class 1 Lump Sum</option>
                <option value="Discount">Discount</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-slate-800">Description</label>
            <textarea 
              rows={4}
              placeholder={isEditOpen ? "Add Comment" : ""}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-[14px] bg-white border border-border rounded-lg outline-none focus:border-[#5D6BEE] transition-colors text-slate-700 resize-none"
            />
          </div>

          <div className="space-y-1.5 flex items-center justify-between">
            <div>
              <label className="text-[13px] font-bold text-slate-800 block">Status</label>
              <span className="text-[12px] text-slate-500">Change the Status by toggle</span>
            </div>
            <button 
              type="button"
              onClick={() => setFormStatus(formStatus === "Active" ? "Inactive" : "Active")}
              className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${formStatus === "Active" ? "bg-[#5D6BEE]" : "bg-slate-200"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formStatus === "Active" ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
              className="px-6 py-2.5 bg-[#F1F5F9] text-slate-700 text-[14px] font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-[#5D6BEE] text-white text-[14px] font-bold rounded-lg hover:bg-[#4b58ce] transition-colors shadow-sm cursor-pointer"
            >
              {isAddOpen ? "Add Fees Type" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm" onClick={() => setIsDeleteOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] bg-white rounded-2xl shadow-xl z-[70] overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-[#202c4b] mb-3">Confirm Deletion</h2>
            <p className="text-[14px] text-slate-500 leading-relaxed mb-8">
              You want to delete all the marked items, this cant be undone once you delete.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsDeleteOpen(false)}
                className="px-6 py-2.5 bg-[#F1F5F9] text-slate-700 text-[14px] font-bold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-6 py-2.5 bg-rose-500 text-white text-[14px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/20 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
