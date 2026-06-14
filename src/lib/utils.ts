import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Gộp Tailwind class an toàn (tránh xung đột) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format ngày theo kiểu Việt Nam */
export function toVNDatetimeLocal(value: string | Date): string {
    if (!value) return '';
    return dayjs(value).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm');
}

/** Chuyển từ string của thẻ <input type="datetime-local"> (Giờ VN) sang UTC ISO string để gửi lên BE */
export function fromVNDatetimeLocalToUTC(localStr: string): string {
    if (!localStr) return '';
    return dayjs.tz(localStr, 'Asia/Ho_Chi_Minh').utc().toISOString();
}

/** Format hiển thị ra màn hình cho người dùng xem */
export function formatDateTime(value: string | Date): string {
    if (!value) return '';
    // Tùy chỉnh format hiển thị ở đây (VD: 09:30 15/06/2026)
    return dayjs(value).tz('Asia/Ho_Chi_Minh').format('HH:mm DD/MM/YYYY');
}
/** Lấy 2 chữ cái đầu của tên (dùng cho avatar) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Rút gọn chuỗi quá dài */
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/** Chuyển query object → query string (bỏ key undefined/empty) */
export function toQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) {
      sp.set(k, String(v));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

/** Debounce đơn giản */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
/**Ghep thanh ho va ten */
export const fullName = (person: { last_name?: string; first_name?: string } | null) =>
    `${person?.last_name ?? ""} ${person?.first_name ?? ""}`.trim();