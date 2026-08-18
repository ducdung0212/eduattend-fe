import { ReactNode, useState, Fragment } from 'react';
import { cn } from '@/lib/utils';
import { IconCheck } from '@tabler/icons-react';

export interface Column<T> {
  key: string;
  label: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey: (row: T) => string;
  skeletonRows?: number;
  emptyText?: string;
  expandable?: boolean;
  expandedRowRender?: (row: T) => ReactNode;
  selectable?: boolean;
  selectedRowKeys?: string[];
  onSelectChange?: (keys: string[]) => void;
  onSelectAll?: (checked: boolean) => void;
}

function SkeletonRow({ cols, selectable }: { cols: number, selectable?: boolean }) {
  return (
    <tr className="border-b border-slate-100">
      {selectable && (
        <td className="px-4 py-3.5 w-[50px]">
          <div className="h-4 w-4 rounded bg-slate-100 animate-pulse" />
        </td>
      )}
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 rounded bg-slate-100 animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  loading,
  rowKey,
  skeletonRows = 8,
  emptyText = 'Không có dữ liệu.',
  expandable,
  expandedRowRender,
  selectable,
  selectedRowKeys = [],
  onSelectChange,
  onSelectAll,
}: DataTableProps<T>) {
  const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };
  
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedKeys(next);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectAll) {
      onSelectAll(e.target.checked);
      return;
    }
    if (!onSelectChange) return;
    if (e.target.checked) {
      const currentPageKeys = data.map(rowKey);
      const newKeys = Array.from(new Set([...selectedRowKeys, ...currentPageKeys]));
      onSelectChange(newKeys);
    } else {
      const currentPageKeys = data.map(rowKey);
      const newKeys = selectedRowKeys.filter(key => !currentPageKeys.includes(key));
      onSelectChange(newKeys);
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    if (!onSelectChange) return;
    if (checked) {
      onSelectChange([...selectedRowKeys, key]);
    } else {
      onSelectChange(selectedRowKeys.filter(k => k !== key));
    }
  };

  const currentPageKeys = data.map(rowKey);
  const isAllCurrentPageSelected = data.length > 0 && currentPageKeys.every(key => selectedRowKeys.includes(key));
  const isSomeCurrentPageSelected = data.length > 0 && currentPageKeys.some(key => selectedRowKeys.includes(key));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {selectable && (
              <th className="px-4 py-3 text-left w-[50px]">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={isAllCurrentPageSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = !isAllCurrentPageSelected && isSomeCurrentPageSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                  />
                </div>
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide',
                  ALIGN[col.align ?? 'left'],
                  col.className,
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} selectable={selectable} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-slate-400 text-sm">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const key = rowKey(row);
              const isExpanded = expandedKeys.has(key);
              const isSelected = selectedRowKeys.includes(key);
              
              return (
                <Fragment key={key}>
                  <tr
                    onClick={() => expandable && toggleRow(key)}
                    className={cn(
                      "border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors",
                      expandable && "cursor-pointer",
                      isSelected && "bg-blue-50/30"
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(key, e.target.checked)}
                          />
                        </div>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn('px-4 py-3.5 text-slate-700', ALIGN[col.align ?? 'left'], col.className)}
                      >
                        {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && expandedRowRender && (
                    <tr className="bg-slate-50/30 border-b border-slate-100 last:border-0">
                      <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                        {expandedRowRender(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}