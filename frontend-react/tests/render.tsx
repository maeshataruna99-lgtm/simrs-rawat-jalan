/**
 * Helper test: merender route aplikasi dengan provider yang sama seperti App.tsx.
 *
 * Dipakai di: tests/*.test.tsx.
 */
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { routes as appRoutes } from '@/routes';

export function renderAt(path: string, routes: RouteObject[] = appRoutes) {
  return render(
    <ThemeProvider>
      <TooltipProvider>
        <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
      </TooltipProvider>
    </ThemeProvider>,
  );
}
