/**
 * Daftar route aplikasi. Halaman modul ditambahkan di dalam AppLayout dan dibungkus PermissionGuard.
 *
 * Dipakai di: App.tsx, tests/.
 */
import type { RouteObject } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import DokterPage from '@/modules/master/dokter/DokterPage';
import Icd10Page from '@/modules/master/icd10/Icd10Page';
import JadwalDokterPage from '@/modules/master/jadwal/JadwalDokterPage';
import PemeriksaanLabPage from '@/modules/master/lab/PemeriksaanLabPage';
import ObatPage from '@/modules/master/obat/ObatPage';
import PasienPage from '@/modules/master/pasien/PasienPage';
import PoliPage from '@/modules/master/poli/PoliPage';
import TindakanPage from '@/modules/master/tindakan/TindakanPage';
import LoginPage from '@/modules/system/auth/LoginPage';
import MenuPage from '@/modules/system/menu/MenuPage';
import ModulePage from '@/modules/system/module/ModulePage';
import RoleAccessPage from '@/modules/system/role-access/RoleAccessPage';
import RolePage from '@/modules/system/role/RolePage';
import UserPage from '@/modules/system/user/UserPage';
import AntreanPage from '@/modules/transaction/antrean/AntreanPage';
import PemeriksaanPage from '@/modules/transaction/pemeriksaan/PemeriksaanPage';
import FarmasiPage from '@/modules/transaction/resep/FarmasiPage';
import RiwayatMedisPage from '@/modules/transaction/pemeriksaan/RiwayatMedisPage';
import LaboratoriumPage from '@/modules/transaction/lab/LaboratoriumPage';
import BillingPage from '@/modules/transaction/pembayaran/BillingPage';
import BuktiBayarPrintPage from '@/modules/transaction/pembayaran/BuktiBayarPrintPage';
import InvoicePrintPage from '@/modules/transaction/pembayaran/InvoicePrintPage';
import WorklistPage from '@/modules/transaction/pemeriksaan/WorklistPage';
import PendaftaranPage from '@/modules/transaction/pendaftaran/PendaftaranPage';
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
          {
            path: '/master/jadwal-dokter',
            element: (
              <PermissionGuard menu="master-jadwal-dokter">
                <JadwalDokterPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/master/tindakan',
            element: (
              <PermissionGuard menu="master-tindakan">
                <TindakanPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/master/obat',
            element: (
              <PermissionGuard menu="master-obat">
                <ObatPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/master/pemeriksaan-lab',
            element: (
              <PermissionGuard menu="master-pemeriksaan-lab">
                <PemeriksaanLabPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/master/icd10',
            element: (
              <PermissionGuard menu="master-icd10">
                <Icd10Page />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/pendaftaran',
            element: (
              <PermissionGuard menu="pendaftaran">
                <PendaftaranPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/antrean',
            element: (
              <PermissionGuard menu="antrean">
                <AntreanPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/pemeriksaan',
            element: (
              <PermissionGuard menu="pemeriksaan">
                <WorklistPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/pemeriksaan/:kunjunganId',
            element: (
              <PermissionGuard menu="pemeriksaan">
                <PemeriksaanPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/riwayat-medis',
            element: (
              <PermissionGuard menu="riwayat-medis">
                <RiwayatMedisPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/farmasi',
            element: (
              <PermissionGuard menu="farmasi">
                <FarmasiPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/laboratorium',
            element: (
              <PermissionGuard menu="laboratorium">
                <LaboratoriumPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/billing',
            element: (
              <PermissionGuard menu="billing">
                <BillingPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/billing/invoice/:id/cetak',
            element: (
              <PermissionGuard menu="billing">
                <InvoicePrintPage />
              </PermissionGuard>
            ),
          },
          {
            path: '/transaction/billing/pembayaran/:id/cetak',
            element: (
              <PermissionGuard menu="billing">
                <BuktiBayarPrintPage />
              </PermissionGuard>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
