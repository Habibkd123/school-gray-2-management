"use client";

import React, { useState, useMemo } from 'react';

export type ColumnDef<T> = {
  header: string;
  accessorKey?: keyof T;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
};

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  renderSelection?: (item: T) => React.ReactNode;
  selectionHeader?: React.ReactNode;
  noDataMessage?: string;
  minWidth?: string;
}

export function DataTable<T>({ 
  columns, 
  data, 
  onRowClick, 
  renderSelection,
  selectionHeader,
  noDataMessage = "No records found.",
  minWidth = "1000px"
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof T, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        
        if (valA == null) return 1;
        if (valB == null) return -1;

        // basic string comparison
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead className="text-slate-900 dark:text-white font-semibold bg-white dark:bg-slate-900 border-b border-border">
          <tr>
            {selectionHeader && <th className="px-4 py-4 w-12">{selectionHeader}</th>}
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className={`px-4 py-4 whitespace-nowrap ${col.sortable !== false && col.accessorKey ? 'cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' : ''} ${col.className || ''}`}
                onClick={() => col.sortable !== false && col.accessorKey && handleSort(col.accessorKey)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable !== false && col.accessorKey && (
                     <span className={`text-[10px] ml-1 font-bold ${sortConfig?.key === col.accessorKey ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                       {sortConfig?.key === col.accessorKey ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                     </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-slate-600 dark:text-slate-300 font-medium">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectionHeader ? 1 : 0)} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                {noDataMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item, i) => (
              <tr 
                key={i} 
                className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${onRowClick ? 'cursor-pointer group' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {renderSelection && (
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    {renderSelection(item)}
                  </td>
                )}
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-4 py-4 ${col.className || ''}`}>
                    {col.render ? col.render(item, i) : (col.accessorKey ? (item[col.accessorKey] as React.ReactNode) : null)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
