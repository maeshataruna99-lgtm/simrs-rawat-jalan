/**
 * Komponen akar: tema terang/gelap, notifikasi toast, tooltip, dan router.
 */
import { createBrowserRouter, RouterProvider } from 'react-router';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { routes } from '@/routes';

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
