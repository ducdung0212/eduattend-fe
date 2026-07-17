'use client';

import { Sidebar } from '@/components/layouts/Sidebar';
import { Header } from '@/components/layouts/Header';
import { useAuth } from '@/hooks/useAuth';
import { getMenuByRole } from '@/lib/menu-config';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) {
      router.push('/login');
    }
  }, [user, initializing, router]);

  if (initializing || !user) {
    return <div className="h-full flex items-center justify-center">Đang tải...</div>;
  }

  const menuItems = getMenuByRole(user.role);

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      <Sidebar menuItems={menuItems} user={user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}