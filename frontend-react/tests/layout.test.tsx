/**
 * Uji layout setelah login: pemilih modul di top bar, sidebar hanya menampilkan menu modul terpilih,
 * menu aktif, breadcrumb, dan logout.
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
  it('top bar menampilkan pilihan modul milik role dan memilih modul mengganti isi menu di sidebar', async () => {
    renderAt('/');

    const moduleNav = screen.getByRole('navigation', { name: 'Pemilihan modul' });
    expect(within(moduleNav).getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(moduleNav).getByRole('button', { name: 'Pendaftaran' })).toBeInTheDocument();
    expect(within(moduleNav).queryByText('Master Data')).not.toBeInTheDocument();

    const sidebar = document.querySelector('[data-sidebar="content"]') as HTMLElement;
    expect(within(sidebar).getByRole('link', { name: /Ringkasan Dashboard/ })).toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('link', { name: /Pendaftaran Kunjungan/ }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(moduleNav).getByRole('button', { name: 'Pendaftaran' }));

    expect(
      within(sidebar).getByRole('link', { name: /Pendaftaran Kunjungan/ }),
    ).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: /Antrean Poli/ })).toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('link', { name: /Ringkasan Dashboard/ }),
    ).not.toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('link', { name: /Tagihan dan Pembayaran/ }),
    ).not.toBeInTheDocument();
  });

  it('membuka path halaman otomatis mengaktifkan modulnya di top bar, sidebar, dan breadcrumb', () => {
    renderAt('/transaction/billing');

    const moduleNav = screen.getByRole('navigation', { name: 'Pemilihan modul' });
    expect(within(moduleNav).getByRole('button', { name: 'Billing' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

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
