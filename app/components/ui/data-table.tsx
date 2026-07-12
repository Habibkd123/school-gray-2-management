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
  minHeight?: string;
}

export function DataTable<T>({ 
  columns, 
  data, 
  onRowClick, 
  renderSelection,
  selectionHeader,
  noDataMessage = "No records found.",
  minWidth = "1000px",
  minHeight = "180px"
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
    <div className="overflow-x-auto custom-scrollbar pb-10" style={{ minHeight }}>
      <table className="erp-table" style={{ minWidth }}>
        <thead>
          <tr>
            {selectionHeader && <th className="w-12 text-center">{selectionHeader}</th>}
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className={`${col.sortable !== false && col.accessorKey ? 'cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' : ''} ${col.className || ''}`}
                onClick={() => col.sortable !== false && col.accessorKey && handleSort(col.accessorKey)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{col.header}</span>
                  {col.sortable !== false && col.accessorKey && (
                     <span className={`text-[10px] ml-2 font-bold flex-shrink-0 ${sortConfig?.key === col.accessorKey ? 'text-primary' : 'text-slate-300 dark:text-slate-600'}`}>
                       {sortConfig?.key === col.accessorKey ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                     </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectionHeader ? 1 : 0)} className="table-empty">
                {noDataMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item, i) => (
              <tr 
                key={i} 
                className={`${onRowClick ? 'cursor-pointer group' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {renderSelection && (
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    {renderSelection(item)}
                  </td>
                )}
                {columns.map((col, idx) => (
                  <td key={idx} className={col.className || ''}>
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
