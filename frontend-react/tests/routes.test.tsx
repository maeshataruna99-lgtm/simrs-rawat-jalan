/**
 * Uji router dan teks i18n pada halaman dasar.
 */
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from '@/routes';

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
}

describe('routes', () => {
  it('beranda menampilkan nama aplikasi dari i18n', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'SIMRS Rawat Jalan' })).toBeInTheDocument();
  });

  it('URL tidak terdaftar menampilkan halaman tidak ditemukan', () => {
    renderAt('/tidak-ada');
    expect(screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
  });
});
