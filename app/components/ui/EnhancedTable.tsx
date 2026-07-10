"use client";

import React, { useState, useMemo } from "react";
import { Search, Download, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { DataTable, ColumnDef } from "./data-table";
import { PaginationBar } from "./pagination-bar";
import { PrintService } from "@/app/lib/print-service";

interface FilterConfig {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface EnhancedTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  filters?: FilterConfig[];
  onRowClick?: (item: T) => void;
  exportFileName?: string;
  noDataMessage?: string;
  defaultPageSize?: number;
  renderSelection?: (item: T) => React.ReactNode;
  selectionHeader?: React.ReactNode;

  // External pagination parameters (for backend pagination)
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
}

export function EnhancedTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  searchKeys = [],
  filters = [],
  onRowClick,
  exportFileName = "export-data",
  noDataMessage = "No records found.",
  defaultPageSize = 25,
  renderSelection,
  selectionHeader,

  currentPage: externalPage,
  totalPages: externalTotalPages,
  totalItems: externalTotalItems,
  pageSize: externalPageSize,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}: EnhancedTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);

  const isExternalPagination = externalPage !== undefined;
  
  const currentPage = isExternalPagination ? externalPage : localPage;
  const pageSize = isExternalPagination ? externalPageSize! : localPageSize;

  const tableId = useMemo(() => `table-${Math.random().toString(36).substr(2, 9)}`, []);

  // 1. Apply search and filters (only client-side if not using external pagination)
  const processedData = useMemo(() => {
    if (isExternalPagination) return data;

    return data.filter((item) => {
      // Filter check
      for (const filter of filters) {
        const val = selectedFilters[filter.key];
        if (val && val !== "") {
          const itemVal = item[filter.key];
          if (String(itemVal).toLowerCase() !== val.toLowerCase()) {
            return false;
          }
        }
      }

      // Search check
      if (searchQuery && searchKeys.length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matches = searchKeys.some((key) => {
          const val = item[key];
          return val != null && String(val).toLowerCase().includes(query);
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [data, searchQuery, searchKeys, filters, selectedFilters, isExternalPagination]);

  // Reset to page 1 when data changes (client-side only)
  React.useEffect(() => {
    if (!isExternalPagination) {
      setLocalPage(1);
    }
  }, [processedData.length, isExternalPagination]);

  // 2. Pagination variables
  const totalPages = isExternalPagination
    ? externalTotalPages!
    : Math.max(1, Math.ceil(processedData.length / pageSize));

  const totalItems = isExternalPagination
    ? externalTotalItems!
    : processedData.length;

  const paginatedData = useMemo(() => {
    if (isExternalPagination) return data; // already paginated by backend
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize, isExternalPagination, data]);

  // 3. Export to Excel
  const handleExportExcel = () => {
    const rows = processedData.map((item) => {
      const row: Record<string, any> = {};
      columns.forEach((col) => {
        if (col.accessorKey) {
          row[col.header] = item[col.accessorKey as string];
        }
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${exportFileName}.xlsx`);
  };

  // 4. Print / Save to PDF
  const handlePrint = () => {
    const tableContainer = document.getElementById(tableId);
    if (tableContainer) {
      tableContainer.classList.add("printable-area");
      PrintService.print('printable-area', { pageSize: 'A4' });
      tableContainer.classList.remove("printable-area");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar (Search, Filters, Export buttons) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        {/* Search Input (only client-side) */}
        {!isExternalPagination && searchKeys.length > 0 && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[13px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
        )}

        {/* Dynamic Filters (only client-side) */}
        {!isExternalPagination && filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {filters.map((filter) => (
              <select
                key={filter.key}
                value={selectedFilters[filter.key] || ""}
                onChange={(e) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    [filter.key]: e.target.value,
                  }))
                }
                className="px-3 py-2 border border-border rounded-lg bg-white dark:bg-slate-900 text-[12.5px] text-slate-600 dark:text-slate-300 outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="">All {filter.label}s</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleExportExcel}
            className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-[12.5px] font-semibold"
            title="Export Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="p-2 border border-border rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-[12.5px] font-semibold"
            title="Print"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Embedded Table Component */}
      <div id={tableId} className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 transition-opacity">
            <span className="text-[13px] font-bold text-primary animate-pulse">Loading data page...</span>
          </div>
        )}
        <DataTable
          columns={columns}
          data={paginatedData}
          onRowClick={onRowClick}
          noDataMessage={noDataMessage}
          renderSelection={renderSelection}
          selectionHeader={selectionHeader}
        />
        
        {/* Pagination Bar */}
        <div className="no-print">
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={isExternalPagination ? onPageChange! : (p) => setLocalPage(p)}
            onPageSizeChange={isExternalPagination ? onPageSizeChange! : (s) => setLocalPageSize(s)}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
