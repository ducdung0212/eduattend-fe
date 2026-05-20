'use client';
import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reset: () => void;
  /** Danh sách số trang hiển thị (có "…") */
  pageList: (number | '…')[];
}

export function usePagination(
  totalPages: number,
  { initialPage = 1, initialLimit = 10 }: UsePaginationOptions = {},
): UsePaginationReturn {
  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);

  const setPage = useCallback((p: number) => {
    setPageState(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const setLimit = useCallback((l: number) => {
    setLimitState(l);
    setPageState(1);
  }, []);

  const reset = useCallback(() => {
    setPageState(1);
  }, []);

  const pageList = buildPageList(page, totalPages);

  return { page, limit, setPage, setLimit, reset, pageList };
}

function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const list: (number | '…')[] = [1];
  if (current > 3) list.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    list.push(i);
  }
  if (current < total - 2) list.push('…');
  list.push(total);
  return list;
}