/**
 * Uji layout setelah login: tombol hider pemilih modul di bawah header SIMRS Rawat Jalan,
 * sidebar hanya menampilkan menu modul terpilih, menu aktif, breadcrumb, dan logout.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { findMenuByPath } from '@/lib/menu';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { renderAt } from './render';

const pendaftaranUser: UserProfile = {
  id: 2,
  username: 'pendaftaran',
  nama: 'Rina Pendaftaran',
  dokter_id: null,
  role: { id: 2, kode: 'pendaftaran', nama: 'Petugas Pendaftaran' },
  modules: [
    {
      kode: 'dashboard',
      nama: 'Dashboard',
      icon: 'layout-dashboard',
      menus: [
        {
          kode: 'dashboard',
          nama: 'Ringkasan Dashboard',
          path: '/dashboard',
          icon: 'layout-dashboard',
          children: [],
        },
      ],
    },
    {
      kode: 'pendaftaran',
      nama: 'Pendaftaran',
      icon: 'clipboard-list',
      menus: [
        {
          kode: 'pendaftaran',
          nama: 'Pendaftaran Kunjungan',
          path: '/transaction/pendaftaran',
          icon: 'user-plus',
          children: [],
        },
        {
          kode: 'antrean',
          nama: 'Antrean Poli',
          path: '/transaction/antrean',
          icon: 'list-ordered',
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
  useAuthStore.setState({ status: 'authenticated', user: pendaftaranUser });
});

describe('AppLayout', () => {
  it('klik tombol pemilih modul di bawah header SIMRS menampilkan daftar modul dan mengganti isi sidebar', async () => {
    renderAt('/');

    const sidebar = document.querySelector('[data-sidebar="content"]') as HTMLElement;
    expect(within(sidebar).getByRole('link', { name: /Ringkasan Dashboard/ })).toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('link', { name: /Pendaftaran Kunjungan/ }),
    ).not.toBeInTheDocument();

    expect(screen.queryByRole('region', { name: 'Daftar modul' })).not.toBeInTheDocument();

    const switcherButton = screen.getByRole('button', { name: 'Pemilihan modul' });
    await userEvent.click(switcherButton);

    const moduleRegion = screen.getByRole('region', { name: 'Daftar modul' });
    expect(within(moduleRegion).getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(moduleRegion).getByRole('button', { name: 'Pendaftaran' })).toBeInTheDocument();
    expect(within(moduleRegion).queryByText('Master Data')).not.toBeInTheDocument();

    await userEvent.click(within(moduleRegion).getByRole('button', { name: 'Pendaftaran' }));

    expect(screen.queryByRole('region', { name: 'Daftar modul' })).not.toBeInTheDocument();
    expect(
      within(sidebar).getByRole('link', { name: /Pendaftaran Kunjungan/ }),
    ).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: /Antrean Poli/ })).toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('link', { name: /Ringkasan Dashboard/ }),
    ).not.toBeInTheDocument();
  });

  it('membuka path halaman otomatis mengaktifkan modulnya di sidebar dan breadcrumb', () => {
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
    const found = findMenuByPath(pendaftaranUser.modules, '/transaction/billing/12');

    expect(found?.module.kode).toBe('billing');
    expect(found?.trail.map((menu) => menu.kode)).toEqual(['billing']);
  });

  it('path yang tidak ada di menu menghasilkan null', () => {
    expect(findMenuByPath(pendaftaranUser.modules, '/master/pasien')).toBeNull();
  });
});
