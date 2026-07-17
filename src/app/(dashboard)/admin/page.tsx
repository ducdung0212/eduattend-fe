"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data?.data || res.data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu thống kê...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-red-500">Không thể tải dữ liệu thống kê.</div>;
  }

  const { overview } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-500">Các chỉ số quan trọng và phân tích dữ liệu điểm danh</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Bao phủ ảnh khuôn mặt</h3>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <i className="ti ti-scan-eye text-lg"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{overview.photoCoveragePercent}%</div>
          <div className="text-xs text-slate-500 mb-2">{overview.studentsWithPhotos} / {overview.totalStudents} sinh viên đã đăng ký</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${overview.photoCoveragePercent}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Ca thi hôm nay</h3>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i className="ti ti-calendar-event text-lg"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{overview.examsToday}</div>
          <div className="text-xs text-slate-500">Ca thi diễn ra trong ngày</div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Đợt thi đang mở</h3>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <i className="ti ti-folders text-lg"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{overview.activePeriods}</div>
          <div className="text-xs text-slate-500">Kỳ thi đang trong thời gian diễn ra</div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-600">Tổng sinh viên</h3>
            <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <i className="ti ti-users text-lg"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{overview.totalStudents}</div>
          <div className="text-xs text-slate-500">Sinh viên trong hệ thống</div>
        </div>
      </div>
    </div>
  );
}