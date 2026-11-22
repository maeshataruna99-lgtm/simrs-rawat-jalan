/**
 * Uji halaman master jadwal praktik dokter (/master/jadwal-dokter) — poin 2.12.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as dokterApi from '@/modules/master/dokter/dokter.api';
import * as jadwalApi from '@/modules/master/jadwal/jadwal.api';
import * as poliApi from '@/modules/master/poli/poli.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { renderAt } from './render';

vi.mock('@/modules/master/jadwal/jadwal.api');
vi.mock('@/modules/master/dokter/dokter.api');
vi.mock('@/modules/master/poli/poli.api');

const fullPerm = { read: true, create: true, update: true, delete: true };

const adminProfile: UserProfile = {
  id: 1,
  username: 'admin',
  nama: 'Administrator',
  dokter_id: null,
  role: { id: 1, kode: 'admin', nama: 'Administrator' },
  modules: [],
  permissions: {
    'master-jadwal-dokter': fullPerm,
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

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-admin');
  useAuthStore.setState({ status: 'authenticated', user: adminProfile });

  vi.mocked(dokterApi.listDokter).mockResolvedValue({
    items: [
      {
        id: 10,
        kode: 'DR001',
        nama: 'dr. Budi Santoso',
        sip: 'SIP/001',
        spesialis: 'Penyakit Dalam',
        jenis_tenaga: 'dokter',
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 100, total: 1 },
  });

  vi.mocked(poliApi.listPoli).mockResolvedValue({
    items: [
      {
        id: 20,
        kode: 'POLI-UMUM',
        nama: 'Poli Umum',
        prefix_antrean: 'U',
        tarif_pendaftaran: 25000,
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 100, total: 1 },
  });

  vi.mocked(jadwalApi.listJadwalDokter).mockResolvedValue({
    items: [
      {
        id: 1,
        dokter_id: 10,
        poli_id: 20,
        hari: 1,
        hari_nama: 'Senin',
        jam_mulai: '08:00',
        jam_selesai: '12:00',
        kuota: 20,
        is_active: true,
        dokter: { id: 10, kode: 'DR001', nama: 'dr. Budi Santoso', spesialis: 'Penyakit Dalam' },
        poli: { id: 20, kode: 'POLI-UMUM', nama: 'Poli Umum' },
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });
});

describe('JadwalDokterPage (/master/jadwal-dokter)', () => {
  it('memilih dokter dan poli serta menampilkan pesan jadwal bentrok dari server', async () => {
    vi.mocked(jadwalApi.createJadwalDokter).mockRejectedValue(
      apiError(422, {
        success: false,
        message: 'Validasi gagal.',
        errors: {
          jam_mulai: ['Jadwal praktik dokter bentrok dengan jadwal lain di hari yang sama.'],
        },
      }),
    );

    renderAt('/master/jadwal-dokter');

    expect(await screen.findByText('dr. Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('08:00 - 12:00')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Jadwal' }));
    const dialog = await screen.findByRole('dialog');

    await userEvent.selectOptions(within(dialog).getByLabelText('Dokter'), '10');
    await userEvent.selectOptions(within(dialog).getByLabelText('Poli'), '20');
    await userEvent.clear(within(dialog).getByLabelText('Jam Mulai'));
    await userEvent.type(within(dialog).getByLabelText('Jam Mulai'), '10:00');
    await userEvent.clear(within(dialog).getByLabelText('Jam Selesai'));
    await userEvent.type(within(dialog).getByLabelText('Jam Selesai'), '14:00');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Jadwal praktik dokter bentrok dengan jadwal lain di hari yang sama.',
    );
  });
});
