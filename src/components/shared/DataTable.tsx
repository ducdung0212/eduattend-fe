import { ReactNode, useState, Fragment } from 'react';
import { cn } from '@/lib/utils';

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
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-slate-100">
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
}: DataTableProps<T>) {
  const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };
  
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedKeys(next);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
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
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const key = rowKey(row);
              const isExpanded = expandedKeys.has(key);
              
              return (
                <Fragment key={key}>
                  <tr
                    onClick={() => expandable && toggleRow(key)}
                    className={cn(
                      "border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors",
                      expandable && "cursor-pointer"
                    )}
                  >
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
                      <td colSpan={columns.length} className="p-0">
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