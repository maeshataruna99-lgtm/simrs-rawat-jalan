/**
 * Daftar route aplikasi. Halaman modul ditambahkan di dalam AppLayout dan dibungkus PermissionGuard.
 *
 * Dipakai di: App.tsx, tests/.
 */
import type { RouteObject } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import DokterPage from '@/modules/master/dokter/DokterPage';
import PasienPage from '@/modules/master/pasien/PasienPage';
import PoliPage from '@/modules/master/poli/PoliPage';
import LoginPage from '@/modules/system/auth/LoginPage';
import MenuPage from '@/modules/system/menu/MenuPage';
import ModulePage from '@/modules/system/module/ModulePage';
import RoleAccessPage from '@/modules/system/role-access/RoleAccessPage';
import RolePage from '@/modules/system/role/RolePage';
import UserPage from '@/modules/system/user/UserPage';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import UiKitPage from '@/pages/UiKitPage';
import { PermissionGuard } from './PermissionGuard';
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
          {
            path: '/system/user',
            element: (
              <PermissionGuard menu="system-user">
                <UserPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/system/role',
            element: (
              <PermissionGuard menu="system-role">
                <RolePage />
              </PermissionGuard>
            ),
          },
          {
            path: '/system/module',
            element: (
              <PermissionGuard menu="system-module">
                <ModulePage />
              </PermissionGuard>
            ),
          },
          {
            path: '/system/menu',
            element: (
              <PermissionGuard menu="system-menu">
                <MenuPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/system/role-access',
            element: (
              <PermissionGuard menu="system-role-access">
                <RoleAccessPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/master/pasien',
            element: (
              <PermissionGuard menu="master-pasien">
                <PasienPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/master/dokter',
            element: (
              <PermissionGuard menu="master-dokter">
                <DokterPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/master/poli',
            element: (
              <PermissionGuard menu="master-poli">
                <PoliPage />
              </PermissionGuard>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
