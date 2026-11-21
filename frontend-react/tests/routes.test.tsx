/**
 * Uji router: pengalihan ke login dan halaman tidak ditemukan di dalam layout.
 */
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { renderAt } from './render';

describe('routes', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ status: 'guest', user: null });
  });

  it('beranda tanpa login dialihkan ke halaman login', () => {
    renderAt('/');
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('URL tidak terdaftar menampilkan halaman tidak ditemukan', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 1,
        username: 'admin',
        nama: 'Administrator',
        dokter_id: null,
        role: { id: 1, kode: 'admin', nama: 'Administrator' },
        modules: [],
        permissions: {},
      },
    });

    renderAt('/tidak-ada');

    expect(screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
  });
});
