'use client';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (totalPages <= 1 && total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        {total > 0 ? (
          <>
            Hiển thị <span className="font-medium text-slate-700">{start}–{end}</span>{' '}
            trong <span className="font-medium text-slate-700">{total}</span> kết quả
          </>
        ) : (
          '0 kết quả'
        )}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PageBtn disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Trang trước">
            <i className="ti ti-chevron-left" aria-hidden="true" />
          </PageBtn>

          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="w-8 text-center text-xs text-slate-400">…</span>
            ) : (
              <PageBtn
                key={p}
                active={p === page}
                onClick={() => onPageChange(p as number)}
              >
                {p}
              </PageBtn>
            ),
          )}

          <PageBtn disabled={page === totalPages} onClick={() => onPageChange(page + 1)} aria-label="Trang sau">
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </PageBtn>
        </div>
      )}
    </div>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors border',
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const list: (number | '…')[] = [1];
  if (current > 3) list.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) list.push(i);
  if (current < total - 2) list.push('…');
  list.push(total);
  return list;
}