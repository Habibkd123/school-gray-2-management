"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  Columns as ColumnsIcon,
  Download,
  Printer,
  X,
  RotateCcw,
  Check,
  ChevronDown,
  MoreHorizontal
} from "lucide-react";

export interface FilterField {
  id: string;
  label: string;
  type: "select" | "text" | "date" | "autocomplete";
  value: any;
  onChange: (val: any) => void;
  options?: { label: string; value: string }[];
  placeholder?: string;
  onSearch?: (query: string) => void;
  filteredOptions?: { label: string; value: string; description?: string; badge?: string }[];
}

export interface ColumnSetting {
  id: string;
  label: string;
  visible: boolean;
  mandatory?: boolean;
}

export interface SearchToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;

  filters: FilterField[];
  onApplyFilters?: () => void;
  onResetFilters: () => void;
  activeFiltersCount: number;

  columns: ColumnSetting[];
  onColumnToggle: (columnId: string) => void;
  onResetColumns: () => void;
  onSelectAllColumns: () => void;
  onClearAllColumns: () => void;

  onExport: (format: "csv" | "excel" | "pdf") => void;
  onPrint: () => void;
}

export function SearchToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onApplyFilters,
  onResetFilters,
  activeFiltersCount,
  columns,
  onColumnToggle,
  onResetColumns,
  onSelectAllColumns,
  onClearAllColumns,
  onExport,
  onPrint
}: SearchToolbarProps) {
  // Local debounce search state
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Synchronize local search state with prop changes
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce the search input updates
  useEffect(() => {
    if (localSearch === searchQuery) return;
    const handler = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => clearTimeout(handler);
  }, [localSearch, onSearchChange, searchQuery]);

  // Dropdown/Popover open states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Popover refs for click outside detection
  const filterRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Autocomplete search terms state map
  const [autocompleteSearch, setAutocompleteSearch] = useState<Record<string, string>>({});
  // Open states for individual autocomplete select lists
  const [openAutocompleteId, setOpenAutocompleteId] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (isFilterOpen && filterRef.current && !filterRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
      if (isColumnsOpen && columnsRef.current && !columnsRef.current.contains(target)) {
        setIsColumnsOpen(false);
      }
      if (isExportOpen && exportRef.current && !exportRef.current.contains(target)) {
        setIsExportOpen(false);
      }
      if (isMoreOpen && moreRef.current && !moreRef.current.contains(target)) {
        setIsMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen, isColumnsOpen, isExportOpen, isMoreOpen]);

  // Temporary filters state for "Apply Filters" modal/popover behavior
  const [tempFilterValues, setTempFilterValues] = useState<Record<string, any>>({});

  // Sync temp values when popover opens
  useEffect(() => {
    if (isFilterOpen) {
      const initial: Record<string, any> = {};
      filters.forEach((f) => {
        initial[f.id] = f.value;
      });
      setTempFilterValues(initial);
    }
  }, [isFilterOpen, filters]);

  const handleTempFilterChange = (id: string, value: any) => {
    setTempFilterValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleApplyFilters = () => {
    filters.forEach((f) => {
      f.onChange(tempFilterValues[f.id]);
    });
    if (onApplyFilters) onApplyFilters();
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    onResetFilters();
    setIsFilterOpen(false);
  };

  return (
    <div className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-border rounded-2xl shadow-sm p-4 no-print transition-all duration-300">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Left Section: Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 focus:border-primary transition-all duration-200"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop Buttons Row (Visible on lg, hidden on md/sm) */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Active Filter Clear Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all duration-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters ({activeFiltersCount})</span>
            </button>
          )}

          {/* Filter Popover Trigger */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-4 py-2.5 border text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                isFilterOpen || activeFiltersCount > 0
                  ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2.5 w-[380px] sm:w-[500px] md:w-[600px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl z-50 p-5 flex flex-col gap-5 text-left transform origin-top-right transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Filter Records</h4>
                  <button onClick={() => setIsFilterOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filters Fields Grid (2 columns on sm/md/lg) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                  {filters.map((f) => (
                    <div key={f.id} className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{f.label}</label>
                      {f.type === "select" && (
                        <div className="relative">
                          <select
                            value={tempFilterValues[f.id] || ""}
                            onChange={(e) => handleTempFilterChange(f.id, e.target.value)}
                            className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg outline-none appearance-none cursor-pointer"
                          >
                            <option value="">All {f.label}s</option>
                            {f.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      )}

                      {f.type === "date" && (
                        <input
                          type="date"
                          value={tempFilterValues[f.id] || ""}
                          onChange={(e) => handleTempFilterChange(f.id, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg outline-none"
                        />
                      )}

                      {f.type === "text" && (
                        <input
                          type="text"
                          value={tempFilterValues[f.id] || ""}
                          placeholder={f.placeholder || `Filter by ${f.label}`}
                          onChange={(e) => handleTempFilterChange(f.id, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg outline-none"
                        />
                      )}

                      {f.type === "autocomplete" && (
                        <div className="relative">
                          <div
                            onClick={() => setOpenAutocompleteId(openAutocompleteId === f.id ? null : f.id)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer flex items-center justify-between"
                          >
                            <span className="truncate">
                              {f.options?.find(o => o.value === tempFilterValues[f.id])?.label || tempFilterValues[f.id] || `Select ${f.label}`}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </div>

                          {openAutocompleteId === f.id && (
                            <>
                              <div className="fixed inset-0 z-[60]" onClick={() => setOpenAutocompleteId(null)} />
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-2xl z-[70] p-2 flex flex-col gap-2 max-h-[220px]">
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                  <input
                                    type="text"
                                    placeholder={`Search ${f.label}...`}
                                    value={autocompleteSearch[f.id] || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAutocompleteSearch(prev => ({ ...prev, [f.id]: val }));
                                      if (f.onSearch) f.onSearch(val);
                                    }}
                                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none bg-slate-50 dark:bg-slate-900 text-foreground font-bold"
                                  />
                                </div>
                                <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-900">
                                  <div
                                    onClick={() => {
                                      handleTempFilterChange(f.id, "");
                                      setOpenAutocompleteId(null);
                                      setAutocompleteSearch(prev => ({ ...prev, [f.id]: "" }));
                                      if (f.onSearch) f.onSearch("");
                                    }}
                                    className="p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-rose-500"
                                  >
                                    Clear Selection
                                  </div>
                                  {f.filteredOptions?.map((opt) => (
                                    <div
                                      key={opt.value}
                                      onClick={() => {
                                        handleTempFilterChange(f.id, opt.value);
                                        setOpenAutocompleteId(null);
                                        setAutocompleteSearch(prev => ({ ...prev, [f.id]: "" }));
                                        if (f.onSearch) f.onSearch("");
                                      }}
                                      className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 flex justify-between items-center ${
                                        tempFilterValues[f.id] === opt.value ? "bg-primary/10 text-primary" : ""
                                      }`}
                                    >
                                      <div className="text-left">
                                        <p className="font-extrabold text-slate-850 dark:text-slate-200">{opt.label}</p>
                                        {opt.description && <p className="text-[9px] text-slate-400 mt-0.5">{opt.description}</p>}
                                      </div>
                                      {opt.badge && (
                                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 text-[8px] font-black uppercase">
                                          {opt.badge}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4 mt-1">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Reset All
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columns Config Settings */}
          <div className="relative" ref={columnsRef}>
            <button
              onClick={() => setIsColumnsOpen(!isColumnsOpen)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer"
            >
              <ColumnsIcon className="w-3.5 h-3.5" />
              <span>Columns</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isColumnsOpen && (
              <div className="absolute right-0 mt-2.5 w-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl z-50 p-4 flex flex-col gap-3.5 text-left transform origin-top-right transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2.5">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Column Settings</h4>
                  <button onClick={() => setIsColumnsOpen(false)} className="p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Checklist */}
                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                  {columns.map((col) => (
                    <label
                      key={col.id}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        col.mandatory ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={col.visible}
                          disabled={col.mandatory}
                          onChange={() => !col.mandatory && onColumnToggle(col.id)}
                          className="w-4 h-4 accent-primary cursor-pointer rounded"
                        />
                        <span className="text-slate-700 dark:text-slate-350">{col.label}</span>
                      </div>
                      {col.mandatory && (
                        <span className="text-[9px] text-slate-400 uppercase font-black bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {/* Sub controls */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                  <button
                    onClick={onSelectAllColumns}
                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-350 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={onClearAllColumns}
                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-350 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={onResetColumns}
                    className="col-span-2 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 text-[10px] font-black rounded-lg transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Menu Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2.5 w-44 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-1 text-left transform origin-top-right transition-all duration-200 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    onExport("csv");
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Export CSV (.csv)
                </button>
                <button
                  onClick={() => {
                    onExport("excel");
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Export Excel (.xlsx)
                </button>
                <button
                  onClick={() => {
                    onExport("pdf");
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Export PDF Document
                </button>
              </div>
            )}
          </div>

          {/* Print Button */}
          <button
            onClick={onPrint}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>

        {/* Mobile Actions Menu Dropdown (Visible on mobile/tablet, hidden on desktop) */}
        <div className="flex lg:hidden items-center gap-2 w-full justify-between sm:justify-end">
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="px-3 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear ({activeFiltersCount})</span>
            </button>
          )}

          <div className="relative w-full sm:w-auto" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span>More Actions</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 mt-2.5 w-full sm:w-56 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-2xl z-50 p-2 flex flex-col gap-1 text-left transform origin-top-right animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsFilterOpen(true);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" /> Filter {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}
                </button>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsColumnsOpen(true);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <ColumnsIcon className="w-4 h-4" /> Columns Config
                </button>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsExportOpen(true);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Export Options
                </button>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onPrint();
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print PDF
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Filter Popover over screen on Mobile if triggered */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Filter Records</h4>
              <button onClick={() => setIsFilterOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-905 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
              {filters.map((f) => (
                <div key={f.id} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">{f.label}</label>
                  {f.type === "select" && (
                    <div className="relative">
                      <select
                        value={tempFilterValues[f.id] || ""}
                        onChange={(e) => handleTempFilterChange(f.id, e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg outline-none appearance-none cursor-pointer"
                      >
                        <option value="">All {f.label}s</option>
                        {f.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  )}

                  {f.type === "date" && (
                    <input
                      type="date"
                      value={tempFilterValues[f.id] || ""}
                      onChange={(e) => handleTempFilterChange(f.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg outline-none"
                    />
                  )}

                  {f.type === "text" && (
                    <input
                      type="text"
                      value={tempFilterValues[f.id] || ""}
                      placeholder={f.placeholder || `Filter by ${f.label}`}
                      onChange={(e) => handleTempFilterChange(f.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg outline-none"
                    />
                  )}

                  {f.type === "autocomplete" && (
                    <div className="relative">
                      <div
                        onClick={() => setOpenAutocompleteId(openAutocompleteId === f.id ? null : f.id)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer flex items-center justify-between"
                      >
                        <span className="truncate">
                          {f.options?.find(o => o.value === tempFilterValues[f.id])?.label || tempFilterValues[f.id] || `Select ${f.label}`}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>

                      {openAutocompleteId === f.id && (
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setOpenAutocompleteId(null)} />
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-2xl z-[70] p-2 flex flex-col gap-2 max-h-[180px]">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                              <input
                                type="text"
                                placeholder={`Search ${f.label}...`}
                                value={autocompleteSearch[f.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAutocompleteSearch(prev => ({ ...prev, [f.id]: val }));
                                  if (f.onSearch) f.onSearch(val);
                                }}
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none bg-slate-50 dark:bg-slate-900 text-foreground font-bold"
                              />
                            </div>
                            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-900">
                              <div
                                onClick={() => {
                                  handleTempFilterChange(f.id, "");
                                  setOpenAutocompleteId(null);
                                  setAutocompleteSearch(prev => ({ ...prev, [f.id]: "" }));
                                  if (f.onSearch) f.onSearch("");
                                }}
                                className="p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-rose-500"
                              >
                                Clear Selection
                              </div>
                              {f.filteredOptions?.map((opt) => (
                                <div
                                  key={opt.value}
                                  onClick={() => {
                                    handleTempFilterChange(f.id, opt.value);
                                    setOpenAutocompleteId(null);
                                    setAutocompleteSearch(prev => ({ ...prev, [f.id]: "" }));
                                    if (f.onSearch) f.onSearch("");
                                  }}
                                  className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 flex justify-between items-center ${
                                    tempFilterValues[f.id] === opt.value ? "bg-primary/10 text-primary" : ""
                                  }`}
                                >
                                  <div className="text-left">
                                    <p className="font-extrabold text-slate-850 dark:text-slate-200">{opt.label}</p>
                                    {opt.description && <p className="text-[9px] text-slate-400 mt-0.5">{opt.description}</p>}
                                  </div>
                                  {opt.badge && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 text-[8px] font-black uppercase">
                                      {opt.badge}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold rounded-xl transition-colors"
              >
                Reset All
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Columns Popover over screen on Mobile if triggered */}
      {isColumnsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Column Settings</h4>
              <button onClick={() => setIsColumnsOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-905 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1">
              {columns.map((col) => (
                <label
                  key={col.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    col.mandatory ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      disabled={col.mandatory}
                      onChange={() => !col.mandatory && onColumnToggle(col.id)}
                      className="w-4.5 h-4.5 accent-primary cursor-pointer rounded"
                    />
                    <span className="text-slate-700 dark:text-slate-350">{col.label}</span>
                  </div>
                  {col.mandatory && (
                    <span className="text-[9px] text-slate-400 uppercase font-black bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-850 pt-3">
              <button
                onClick={onSelectAllColumns}
                className="px-2 py-2 border border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-350 rounded-lg hover:bg-slate-50"
              >
                Select All
              </button>
              <button
                onClick={onClearAllColumns}
                className="px-2 py-2 border border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-350 rounded-lg hover:bg-slate-50"
              >
                Clear All
              </button>
              <button
                onClick={onResetColumns}
                className="col-span-2 px-2 py-2 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:bg-slate-100 text-[10px] font-black rounded-lg"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
