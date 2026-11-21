/**
 * Daftar route aplikasi. Halaman modul ditambahkan di dalam AppLayout dan dibungkus PermissionGuard.
 *
 * Dipakai di: App.tsx, tests/.
 */
import type { RouteObject } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/modules/system/auth/LoginPage';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import UiKitPage from '@/pages/UiKitPage';
import { RequireAuth } from './RequireAuth';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/ui-kit', element: <UiKitPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
