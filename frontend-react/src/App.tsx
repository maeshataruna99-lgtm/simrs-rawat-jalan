/**
 * Komponen akar: tema terang/gelap, notifikasi toast, tooltip, router, dan pemulihan sesi login.
 */
import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/auth-store';
import { routes } from '@/routes';

const router = createBrowserRouter(routes);

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
