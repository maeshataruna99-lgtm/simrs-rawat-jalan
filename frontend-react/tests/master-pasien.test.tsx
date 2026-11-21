/**
 * Uji halaman master pasien (/master/pasien, poin 2.10).
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as pasienApi from '@/modules/master/pasien/pasien.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { renderAt } from './render';

vi.mock('@/modules/master/pasien/pasien.api');

const fullPerm = { read: true, create: true, update: true, delete: true };

const adminProfile: UserProfile = {
  id: 1,
  username: 'admin',
  nama: 'Administrator',
  dokter_id: null,
  role: { id: 1, kode: 'admin', nama: 'Administrator' },
  modules: [],
  permissions: {
    'master-pasien': fullPerm,
  },
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

const samplePasien = [
  {
    id: 1,
    no_rm: 'RM000001',
    nik: '3201010101900001',
    nama: 'Budi Santoso',
    tgl_lahir: '1990-01-01',
    jenis_kelamin: 'L' as const,
    alamat: 'Jl. Merdeka 1',
    no_hp: '081234567890',
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-admin');
  useAuthStore.setState({ status: 'authenticated', user: adminProfile });
  vi.mocked(pasienApi.listPasien).mockResolvedValue({
    items: samplePasien,
    meta: { page: 1, per_page: 20, total: 1 },
  });
});

describe('PasienPage (/master/pasien)', () => {
  it('menampilkan daftar pasien, mencari data, dan menampilkan error validasi di form', async () => {
    vi.mocked(pasienApi.createPasien).mockRejectedValue(
      apiError(409, {
        success: false,
        message: 'NIK sudah terdaftar.',
      }),
    );

    renderAt('/master/pasien');

    expect(await screen.findByText('RM000001')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Pasien' }));
    const dialog = await screen.findByRole('dialog');

    await userEvent.type(within(dialog).getByLabelText('NIK'), '123');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(
      await within(dialog).findByText('NIK harus terdiri dari 16 digit angka.'),
    ).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByLabelText('NIK'));
    await userEvent.type(within(dialog).getByLabelText('NIK'), '3201010101900001');
    await userEvent.type(within(dialog).getByLabelText('Nama Pasien'), 'Budi Duplikat');
    await userEvent.type(within(dialog).getByLabelText('Tanggal Lahir'), '1990-01-01');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('NIK sudah terdaftar.');
  });
});
