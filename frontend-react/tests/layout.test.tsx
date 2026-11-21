/**
 * Uji layout setelah login: sidebar sesuai role, menu aktif, breadcrumb, dan logout.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { renderAt } from './render';
import { findMenuByPath } from '@/lib/menu';
import type { UserProfile } from '@/modules/system/auth/auth.types';

const kasir: UserProfile = {
  id: 6,
  username: 'kasir',
  nama: 'Sari Kasir',
  dokter_id: null,
  role: { id: 9, kode: 'kasir', nama: 'Kasir' },
  modules: [
    {
      kode: 'dashboard',
      nama: 'Dashboard',
      icon: 'layout-dashboard',
      menus: [
        {
          kode: 'dashboard',
          nama: 'Dashboard',
          path: '/dashboard',
          icon: 'layout-dashboard',
          children: [],
        },
      ],
    },
    {
      kode: 'billing',
      nama: 'Billing',
      icon: 'receipt',
      menus: [
        {
          kode: 'billing',
          nama: 'Tagihan dan Pembayaran',
          path: '/transaction/billing',
          icon: 'receipt',
          children: [],
        },
      ],
    },
  ],
  permissions: {},
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('simrs_token', 'tok');
  useAuthStore.setState({ status: 'authenticated', user: kasir });
});

describe('AppLayout', () => {
  it('sidebar hanya berisi modul dan menu milik role', () => {
    renderAt('/');

    const sidebar = screen.getByText('Billing').closest('[data-sidebar="content"]') as HTMLElement;
    expect(
      within(sidebar).getByRole('link', { name: /Tagihan dan Pembayaran/ }),
    ).toBeInTheDocument();
    expect(within(sidebar).queryByText('Master Data')).not.toBeInTheDocument();
  });

  it('menu aktif dan breadcrumb mengikuti path halaman', () => {
    renderAt('/transaction/billing');

    const link = screen.getAllByRole('link', { name: /Tagihan dan Pembayaran/ })[0];
    expect(link).toHaveAttribute('aria-current', 'page');
    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(breadcrumb).getByText('Billing')).toBeInTheDocument();
    expect(within(breadcrumb).getByText('Tagihan dan Pembayaran')).toBeInTheDocument();
  });

  it('tombol keluar mengakhiri sesi dan kembali ke halaman login', async () => {
    renderAt('/');

    await userEvent.click(screen.getByRole('button', { name: 'Keluar' }));

    expect(await screen.findByRole('button', { name: 'Masuk' })).toBeInTheDocument();
    expect(localStorage.getItem('simrs_token')).toBeNull();
  });
});

describe('findMenuByPath', () => {
  it('path turunan tetap cocok dengan menu induknya', () => {
    const found = findMenuByPath(kasir.modules, '/transaction/billing/12');

    expect(found?.module.kode).toBe('billing');
    expect(found?.trail.map((menu) => menu.kode)).toEqual(['billing']);
  });

  it('path yang tidak ada di menu menghasilkan null', () => {
    expect(findMenuByPath(kasir.modules, '/master/pasien')).toBeNull();
  });
});
