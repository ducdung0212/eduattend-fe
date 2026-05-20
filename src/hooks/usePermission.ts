'use client';
import { useMemo } from 'react';
import { Role } from '@/types';
import { getCurrentUser } from '@/lib/auth';

const PERMISSIONS: Record<Role, string[]> = {
  admin: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'course:read', 'course:create', 'course:update', 'course:delete',
    'attendance:read', 'attendance:manage',
    'grade:read', 'grade:manage',
    'report:read',
  ],
  lecturer: [
    'course:read',
    'attendance:read', 'attendance:manage',
    'grade:read', 'grade:manage',
  ],
  student: [
    'course:read',
    'attendance:read',
    'grade:read',
  ],
};

interface UsePermissionReturn {
  role: Role | null;
  can: (permission: string) => boolean;
  isAdmin: boolean;
  isLecturer: boolean;
  isStudent: boolean;
}

export function usePermission(): UsePermissionReturn {
  const user = getCurrentUser();
  const role = user?.role ?? null;

  const permissions = useMemo(() => {
    if (!role) return [];
    return PERMISSIONS[role] ?? [];
  }, [role]);

  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  return {
    role,
    can,
    isAdmin: role === 'admin',
    isLecturer: role === 'lecturer',
    isStudent: role === 'student',
  };
}

function useCallback<T>(fn: T, _deps: unknown[]): T {
  return useMemo(() => fn, _deps);
}