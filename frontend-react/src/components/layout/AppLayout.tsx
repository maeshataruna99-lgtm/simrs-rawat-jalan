/**
 * Kerangka halaman setelah login: sidebar dengan pemilih modul tersembunyi (hider) di bawah header
 * SIMRS Rawat Jalan, header breadcrumb, dan area konten.
 *
 * Dipakai di: routes/index.tsx sebagai induk semua halaman modul.
 */
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuthStore } from '@/lib/auth-store';
import { findMenuByPath } from '@/lib/menu';
import { ChatbotWidget } from '@/modules/chatbot/ChatbotWidget';
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
      <AppSidebar activeModule={activeModule} onSelectModule={handleSelectModule} />
      <SidebarInset className="min-w-0">
        <AppHeader activeModule={activeModule} />
        <div className="flex-1 p-4 pb-20 md:p-6 md:pb-24 print:p-0">
          <Outlet />
        </div>
      </SidebarInset>
      <ChatbotWidget />
    </SidebarProvider>
  );
}
