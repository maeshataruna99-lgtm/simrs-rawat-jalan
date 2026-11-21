/**
 * Uji alur login, penyimpanan sesi, dan pembatasan halaman berdasarkan izin.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { renderAt } from './render';
import { tokenStorage } from '@/lib/token-storage';
import * as authApi from '@/modules/system/auth/auth.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { PermissionGuard } from '@/routes/PermissionGuard';

vi.mock('@/modules/system/auth/auth.api');

const kasir: UserProfile = {
  id: 6,
  username: 'kasir',
  nama: 'Sari Kasir',
  dokter_id: null,
  role: { id: 9, kode: 'kasir', nama: 'Kasir' },
  modules: [],
  permissions: { billing: { read: true, create: true, update: true, delete: false } },
};

function apiError(status: number, data: object) {
  return new AxiosError('gagal', String(status), undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  useAuthStore.setState({ status: 'guest', user: null });
});

describe('login', () => {
  it('login berhasil menyimpan token dan menampilkan beranda', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'tok-123', expires_at: 0, user: kasir });
    renderAt('/');

    await userEvent.type(screen.getByLabelText('Username'), 'kasir');
    await userEvent.type(screen.getByLabelText('Password'), 'simrs123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(
      await screen.findByRole('heading', { name: 'Selamat datang, Sari Kasir' }),
    ).toBeInTheDocument();
    expect(tokenStorage.get()).toBe('tok-123');
    expect(authApi.login).toHaveBeenCalledWith('kasir', 'simrs123');
  });

  it('form kosong menampilkan pesan wajib tanpa memanggil API', async () => {
    renderAt('/login');

    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByText('Username wajib diisi.')).toBeInTheDocument();
    expect(screen.getByText('Password wajib diisi.')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('password salah menampilkan pesan dari server', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      apiError(401, { success: false, message: 'Username atau password salah.' }),
    );
    renderAt('/login');

    await userEvent.type(screen.getByLabelText('Username'), 'kasir');
    await userEvent.type(screen.getByLabelText('Password'), 'salah');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Username atau password salah.');
    expect(tokenStorage.get()).toBeNull();
  });
});

describe('sesi', () => {
  it('token tersimpan dipulihkan menjadi sesi aktif', async () => {
    tokenStorage.set('tok-lama');
    vi.mocked(authApi.fetchProfile).mockResolvedValue(kasir);

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.username).toBe('kasir');
  });

  it('token tidak sah dibuang dan user menjadi guest', async () => {
    tokenStorage.set('tok-kedaluwarsa');
    vi.mocked(authApi.fetchProfile).mockRejectedValue(apiError(401, {}));

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().status).toBe('guest');
    expect(tokenStorage.get()).toBeNull();
  });
});

describe('PermissionGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', user: kasir });
  });

  function renderGuard(menu: string, action?: 'read' | 'delete') {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <PermissionGuard menu={menu} action={action}>
            <p>Isi halaman</p>
          </PermissionGuard>
        ),
      },
    ]);
    render(<RouterProvider router={router} />);
  }

  it('menu yang diizinkan menampilkan halaman', () => {
    renderGuard('billing');
    expect(screen.getByText('Isi halaman')).toBeInTheDocument();
  });

  it('menu tanpa izin menampilkan akses ditolak', () => {
    renderGuard('master-pasien');
    expect(screen.getByRole('heading', { name: 'Akses ditolak' })).toBeInTheDocument();
  });

  it('aksi tanpa izin pada menu yang boleh dibaca juga ditolak', () => {
    renderGuard('billing', 'delete');
    expect(screen.queryByText('Isi halaman')).not.toBeInTheDocument();
  });
});
