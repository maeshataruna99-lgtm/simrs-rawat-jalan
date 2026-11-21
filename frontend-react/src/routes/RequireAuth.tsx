/**
 * Pembungkus route yang wajib login. Saat sesi masih diperiksa tampil indikator memuat;
 * tanpa sesi, user diarahkan ke /login dan dikembalikan ke halaman semula setelah login.
 *
 * Dipakai di: routes/index.tsx.
 */
import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/lib/auth-store';

export function RequireAuth() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="flex min-h-svh items-center justify-center" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
