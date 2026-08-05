import { cn } from '@/lib/utils';
// 1. Import các icon bạn cần dùng
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';

interface StatCardProps {
  label: string;
  value: string | number;
  // 2. Đổi kiểu dữ liệu của icon thành ReactNode
  icon?: React.ReactNode; 
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className={cn('bg-white border border-slate-200/70 rounded-xl px-4 py-4', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        {icon && (
          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500">
            {/* 3. Render icon trực tiếp */}
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-medium text-slate-900">{value}</p>
      {trend && (
        <p className={cn('text-xs mt-1 flex items-center', isPositive ? 'text-green-600' : 'text-red-500')}>
          {isPositive ? <IconTrendingUp className="w-3 h-3 mr-0.5" /> : <IconTrendingDown className="w-3 h-3 mr-0.5" />}
          {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </div>
  );
}