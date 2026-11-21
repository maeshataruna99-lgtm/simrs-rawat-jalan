/**
 * Kerangka halaman setelah login: sidebar kontekstual per modul, top bar pemilih modul, dan area konten.
 * Saat pengguna memilih modul di top bar, sidebar hanya menampilkan menu milik modul tersebut.
 *
 * Dipakai di: routes/index.tsx sebagai induk semua halaman modul.
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { findMenuByPath } from '@/lib/menu';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  const { pathname } = useLocation();
  const modules = useAuthStore((s) => s.user?.modules ?? []);
  const routeLocation = findMenuByPath(modules, pathname);

  const [manualChoice, setManualChoice] = useState<{ forPath: string; kode: string } | null>(null);

  const activeModuleKode =
    (manualChoice?.forPath === pathname ? manualChoice.kode : null) ??
    routeLocation?.module.kode ??
    manualChoice?.kode ??
    modules[0]?.kode ??
    null;

  const activeModule = modules.find((mod) => mod.kode === activeModuleKode) ?? modules[0] ?? null;

  const handleSelectModule = (kode: string) => {
    setManualChoice({ forPath: pathname, kode });
  };

  return (
    <SidebarProvider>
      <AppSidebar activeModule={activeModule} />
      <SidebarInset className="min-w-0">
        <AppHeader activeModule={activeModule} onSelectModule={handleSelectModule} />
        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
