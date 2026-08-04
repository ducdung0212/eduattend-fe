import { NextRequest, NextResponse } from 'next/server';

// Prefix URL của mỗi role
const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  lecturer: '/lecturer',
  student: '/student',
};

// Các path không cần auth
const PUBLIC_PATHS = ['/login'];

// Các path dùng chung cho tất cả role đã đăng nhập (không cần prefix role)
const SHARED_AUTH_PATHS = ['/change-password'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bỏ qua static files và API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('access_token')?.value;
  const userRole = req.cookies.get('user_role')?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isSharedAuth = SHARED_AUTH_PATHS.some((p) => pathname.startsWith(p));

  console.log(`[Middleware] Path: ${pathname}, Token: ${!!token}, Role: ${userRole}`);

  // ── Chưa đăng nhập ──────────────────────────────────────────
  if (!token || !userRole) {
    if (isPublic) return NextResponse.next();
    // Lưu lại URL định vào để redirect sau khi login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // ── Đã đăng nhập mà vào trang public → redirect về dashboard ─
  if (isPublic) {
    const home = ROLE_HOME[userRole] ?? '/';
    return NextResponse.redirect(new URL(home, req.url));
  }

  // ── Trang dùng chung cho mọi role → cho phép truy cập ────────
  if (isSharedAuth) {
    return NextResponse.next();
  }

  // ── Truy cập sai role → redirect về đúng dashboard của mình ──
  const allowedPrefix = ROLE_HOME[userRole];
  if (allowedPrefix && !pathname.startsWith(allowedPrefix) && pathname !== '/') {
    return NextResponse.redirect(new URL(allowedPrefix, req.url));
  }

  // ── Root "/" → redirect về dashboard theo role ───────────────
  if (pathname === '/') {
    return NextResponse.redirect(new URL(ROLE_HOME[userRole] ?? '/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Áp dụng cho mọi route trừ static
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};