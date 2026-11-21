/**
 * Daftar route aplikasi. Route modul master dan transaksi ditambahkan per poin roadmap.
 *
 * Dipakai di: App.tsx, tests/.
 */
import type { RouteObject } from 'react-router';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import UiKitPage from '@/pages/UiKitPage';

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/ui-kit', element: <UiKitPage /> },
  { path: '*', element: <NotFoundPage /> },
];
