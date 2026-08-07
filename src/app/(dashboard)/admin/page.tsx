"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { Faculty, Class, PaginationMeta } from "@/types";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { usePagination } from "@/hooks/usePagination";
import { fullName } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Filter State ---
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [facultyCode, setFacultyCode] = useState("");
  const [classCode, setClassCode] = useState("");
  const [isHasPhoto, setIsHasPhoto] = useState<string>("");
  const [search, setSearch] = useState("");
  
  const [students, setStudents] = useState<any[]>([]);
  const [studentsMeta, setStudentsMeta] = useState<PaginationMeta | null>(null); 
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [photoStats, setPhotoStats] = useState<{registered: number, unregistered: number} | null>(null);

  const { page, setPage, reset: resetPage } = usePagination(studentsMeta?.totalPages ?? 1);

  // Fetch Dashboard Stats
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

  // Fetch Faculties
  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const res = await api.get("/faculties");
        setFaculties(res.data?.data || []);
      } catch (error) {
        console.error("Lỗi khi tải danh sách khoa:", error);
      }
    };
    fetchFaculties();
  }, []);

  // Fetch Classes
  useEffect(() => {
    if (!facultyCode || facultyCode === 'ALL') {
      setClasses([]);
      return;
    }
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes", {
          params: { faculty_code: facultyCode }
        });
        const fetchedClasses = res.data?.data || [];
        const sortedClasses = [...fetchedClasses].sort((a: Class, b: Class) => 
          a.class_code.localeCompare(b.class_code)
        );
        setClasses(sortedClasses);
      } catch (error) {
        console.error("Lỗi khi tải danh sách lớp:", error);
      }
    };
    fetchClasses();
  }, [facultyCode]);

  // Fetch Students (all by default, filtered if options selected)
  useEffect(() => {
    const fetchFilteredStudents = async () => {
      if (!facultyCode) {
        setStudents([]);
        setStudentsMeta(null);
        return;
      }

      setLoadingStudents(true);
      try {
        const res = await api.get("/students", {
          params: {
            page,
            limit: 10,
            faculty_code: facultyCode === 'ALL' ? undefined : facultyCode,
            class_code: classCode,
            is_has_photo: isHasPhoto,
            search: search || undefined,
          }
        });
        setStudents(res.data?.data ?? []);
        setStudentsMeta(res.data?.meta ?? null);
      } catch (err) {
        console.error("Lỗi tải danh sách sinh viên:", err);
      } finally {
        setLoadingStudents(false);
      }
    };

    const t = setTimeout(fetchFilteredStudents, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [facultyCode, classCode, isHasPhoto, page, search]);

  // Fetch Photo Stats
  useEffect(() => {
    const fetchPhotoStats = async () => {
      if (!facultyCode) {
        setPhotoStats(null);
        return;
      }
      try {
        const [resRegistered, resUnregistered] = await Promise.all([
          api.get("/students", {
            params: { faculty_code: facultyCode === 'ALL' ? undefined : facultyCode, class_code: classCode || undefined, is_has_photo: 'true', search: search || undefined, limit: 1 }
          }),
          api.get("/students", {
            params: { faculty_code: facultyCode === 'ALL' ? undefined : facultyCode, class_code: classCode || undefined, is_has_photo: 'false', search: search || undefined, limit: 1 }
          })
        ]);
        
        setPhotoStats({
          registered: resRegistered.data?.meta?.total || 0,
          unregistered: resUnregistered.data?.meta?.total || 0,
        });
      } catch (error) {
        console.error("Lỗi khi tải thống kê ảnh:", error);
      }
    };
    
    const t = setTimeout(fetchPhotoStats, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [facultyCode, classCode, search]);

  // Columns for Student Table
  const columns: Column<any>[] = useMemo(() => [
    {
        key: "student_code",
        label: "Mã SV",
        render: (s) => <span className="font-semibold text-slate-900">{s.student_code}</span>,
    },
    {
        key: "name",
        label: "Họ và tên",
        render: (s) => <span className="text-slate-700">{fullName(s)}</span>,
    },
    {
        key: "class",
        label: "Lớp",
        render: (s) => <span className="text-slate-700">{s.class?.class_code}</span>,
    },
    {
        key: "photo",
        label: "Ảnh khuôn mặt",
        render: (s) => (
            <div className="flex items-center">
                {s.image_url ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100">
                        <IconCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs text-emerald-700 font-medium">Đã đăng ký</span>
                    </div>
                ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        Chưa có
                    </span>
                )}
            </div>
        ),
    },
  ], []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu thống kê...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-red-500">Không thể tải dữ liệu thống kê.</div>;
  }

  const { overview } = stats;

  return (
    <div className="space-y-6 pb-10">
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
            <h3 className="text-sm font-semibold text-slate-600">Tổng giảng viên</h3>
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <i className="ti ti-user-scan text-lg"></i>
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">{overview.totalLecturers}</div>
          <div className="text-xs text-slate-500">Giảng viên trong hệ thống</div>
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

      {/* Lọc Sinh Viên section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-2">
          <div className="flex items-center flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-slate-900 mr-2">Tra cứu sinh viên đã đăng ký ảnh</h2>
            
            {facultyCode && studentsMeta && (
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                Tổng: {studentsMeta.total}
              </span>
            )}

            {photoStats && (
              <>
                <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                  Đã đăng ký ảnh: {photoStats.registered}
                </span>
                <span className="text-sm font-medium text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100">
                  Chưa đăng ký ảnh: {photoStats.unregistered}
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-slate-500">Tra cứu và lọc danh sách sinh viên trên toàn hệ thống.</p>
        </div>
        
        <div className="p-5">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <SearchBar
              value={search}
              onChange={(val) => { setSearch(val); resetPage(); }}
              placeholder="Tìm tên, mã SV..."
              className="flex-1 min-w-[200px]"
            />
            
            <select
              value={facultyCode}
              onChange={(e) => { setFacultyCode(e.target.value); setClassCode(""); resetPage(); }}
              className="h-9 px-3 text-sm text-slate-900 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[200px]"
            >
              <option value="">-- Chọn Khoa --</option>
              <option value="ALL">Tất cả Khoa</option>
              {faculties.map(f => (
                <option key={f.faculty_code} value={f.faculty_code}>{f.name}</option>
              ))}
            </select>
            
            <select
              value={classCode}
              onChange={(e) => { setClassCode(e.target.value); resetPage(); }}
              disabled={!facultyCode || facultyCode === 'ALL'}
              className="h-9 px-3 text-sm text-slate-900 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[180px] disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">-- Chọn Lớp --</option>
              {classes.map(c => (
                <option key={c.class_code} value={c.class_code}>{c.class_code}</option>
              ))}
            </select>
            
            <select
              value={isHasPhoto}
              onChange={(e) => { setIsHasPhoto(e.target.value); resetPage(); }}
              className="h-9 px-3 text-sm text-slate-900 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="">-- Trạng thái ảnh --</option>
              <option value="true">Đã đăng ký ảnh</option>
              <option value="false">Chưa đăng ký ảnh</option>
            </select>
          </div>

          {facultyCode ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <DataTable<any>
                columns={columns}
                data={students}
                loading={loadingStudents}
                rowKey={(s) => s.student_code}
                emptyText="Không tìm thấy sinh viên nào."
              />
              {studentsMeta && studentsMeta.totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={studentsMeta.totalPages}
                  total={studentsMeta.total}
                  limit={10}
                  onPageChange={setPage}
                />
              )}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                <i className="ti ti-filter text-xl text-slate-400"></i>
              </div>
              <p className="text-slate-600 font-medium">Chưa chọn Khoa</p>
              <p className="text-sm text-slate-500 mt-1">Vui lòng chọn Khoa hoặc Tất cả Khoa để hiển thị danh sách sinh viên.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}