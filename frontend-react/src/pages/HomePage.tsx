/**
 * Beranda setelah login. Role dengan izin menu dashboard langsung melihat Dashboard & Laporan;
 * role lain hanya melihat sapaan karena navigasi sudah tersedia di sidebar dan pencarian Ctrl+K.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/auth-store';
import DashboardPage from '@/modules/dashboard/DashboardPage';

export default function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canDashboard = useAuthStore((s) => s.can('dashboard', 'read'));

  if (canDashboard) {
    return <DashboardPage />;
  }

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('home.greeting', { nama: user?.nama })}
      </h1>
      <p className="text-sm text-muted-foreground">{t('home.role', { role: user?.role.nama })}</p>
    </div>
  );
}
