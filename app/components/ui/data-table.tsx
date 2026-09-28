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
  virtualized?: boolean;
  rowHeight?: number;
  maxVirtualHeight?: number;
}

export function DataTable<T>({ 
  columns, 
  data, 
  onRowClick, 
  renderSelection,
  selectionHeader,
  noDataMessage = "No records found.",
  minWidth = "1000px",
  minHeight = "180px",
  virtualized = false,
  rowHeight = 52,
  maxVirtualHeight = 550,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof T, direction: 'asc' | 'desc' } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!virtualized) return;
    setScrollTop(e.currentTarget.scrollTop);
  };

  const isVirtual = virtualized && sortedData.length > 20;
  const colCount = columns.length + (selectionHeader ? 1 : 0);

  const virtualCalculations = useMemo(() => {
    if (!isVirtual) {
      return {
        visibleItems: sortedData.map((item, idx) => ({ item, originalIndex: idx })),
        topSpacer: 0,
        bottomSpacer: 0,
      };
    }

    const total = sortedData.length;
    const overscan = 5;
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(maxVirtualHeight / rowHeight) + overscan * 2;
    const endIndex = Math.min(total, startIndex + visibleCount);

    const visibleItems = sortedData.slice(startIndex, endIndex).map((item, localIdx) => ({
      item,
      originalIndex: startIndex + localIdx,
    }));

    const topSpacer = startIndex * rowHeight;
    const bottomSpacer = Math.max(0, (total - endIndex) * rowHeight);

    return { visibleItems, topSpacer, bottomSpacer };
  }, [isVirtual, sortedData, scrollTop, rowHeight, maxVirtualHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-x-auto custom-scrollbar pb-6"
      style={{
        minHeight,
        maxHeight: isVirtual ? `${maxVirtualHeight}px` : undefined,
        overflowY: isVirtual ? "auto" : undefined,
      }}
    >
      <table className="erp-table" style={{ minWidth }}>
        <thead className={isVirtual ? "sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-sm" : ""}>
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
              <td colSpan={colCount} className="table-empty">
                {noDataMessage}
              </td>
            </tr>
          ) : (
            <>
              {virtualCalculations.topSpacer > 0 && (
                <tr style={{ height: `${virtualCalculations.topSpacer}px` }} aria-hidden="true">
                  <td colSpan={colCount} className="p-0 border-0 pointer-events-none" />
                </tr>
              )}
              {virtualCalculations.visibleItems.map(({ item, originalIndex }) => (
                <tr 
                  key={originalIndex} 
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
                      {col.render ? col.render(item, originalIndex) : (col.accessorKey ? (item[col.accessorKey] as React.ReactNode) : null)}
                    </td>
                  ))}
                </tr>
              ))}
              {virtualCalculations.bottomSpacer > 0 && (
                <tr style={{ height: `${virtualCalculations.bottomSpacer}px` }} aria-hidden="true">
                  <td colSpan={colCount} className="p-0 border-0 pointer-events-none" />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
