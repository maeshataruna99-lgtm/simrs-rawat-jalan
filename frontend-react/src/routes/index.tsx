/**
 * Daftar route aplikasi. Halaman modul ditambahkan di dalam RequireAuth dan dibungkus PermissionGuard.
 *
 * Dipakai di: App.tsx, tests/.
 */
import type { RouteObject } from 'react-router';
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
    children: [{ path: '/', element: <HomePage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
];
