/**
 * Pembatas halaman berdasarkan izin menu. Tanpa izin, halaman "akses ditolak" ditampilkan.
 * Pengecekan ini hanya untuk tampilan; backend tetap memeriksa izin di setiap endpoint.
 *
 * Contoh: <PermissionGuard menu="master-pasien"><PasienPage /></PermissionGuard>
 *
 * Dipakai di: routes/index.tsx untuk setiap halaman modul.
 */
import type { ReactNode } from 'react';
import type { PermissionAction } from '@/modules/system/auth/auth.types';
import { useAuthStore } from '@/lib/auth-store';
import ForbiddenPage from '@/pages/ForbiddenPage';

interface Props {
  menu: string;
  action?: PermissionAction;
  children: ReactNode;
}

export function PermissionGuard({ menu, action = 'read', children }: Props) {
  const allowed = useAuthStore((s) => s.can(menu, action));

  return allowed ? children : <ForbiddenPage />;
}
