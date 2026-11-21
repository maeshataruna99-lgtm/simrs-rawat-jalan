/**
 * Uji router: halaman publik, pengalihan ke login, dan halaman tidak ditemukan.
 */
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import { routes } from '@/routes';

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}

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
    renderAt('/tidak-ada');
    expect(screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
  });
});
