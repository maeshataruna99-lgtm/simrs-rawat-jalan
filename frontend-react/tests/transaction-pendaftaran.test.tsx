/**
 * Uji halaman pendaftaran kunjungan (/transaction/pendaftaran) dan antrean poli (/transaction/antrean) — poin 3.6.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as jadwalApi from '@/modules/master/jadwal/jadwal.api';
import * as poliApi from '@/modules/master/poli/poli.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as pendaftaranApi from '@/modules/transaction/pendaftaran/pendaftaran.api';
import { renderAt } from './render';

vi.mock('@/modules/transaction/pendaftaran/pendaftaran.api');
vi.mock('@/modules/master/poli/poli.api');
vi.mock('@/modules/master/jadwal/jadwal.api');

const fullPerm = { read: true, create: true, update: true, delete: true };

const pendaftaranUser: UserProfile = {
  id: 2,
  username: 'pendaftaran',
  nama: 'Rina Pendaftaran',
  dokter_id: null,
  role: { id: 2, kode: 'pendaftaran', nama: 'Petugas Pendaftaran' },
  modules: [],
  permissions: {
    pendaftaran: fullPerm,
    antrean: fullPerm,
    'master-pasien': fullPerm,
  },
};

const samplePasien = {
  id: 10,
  no_rm: 'RM000001',
  nik: '3201010101900001',
  nama: 'Budi Santoso',
  tgl_lahir: '1990-01-01',
  jenis_kelamin: 'L' as const,
  alamat: 'Jl. Merdeka 1',
  no_hp: '081234567890',
};

const sampleKunjungan = {
  id: 100,
  no_kunjungan: 'RJ202611230001',
  pasien_id: 10,
  poli_id: 1,
  dokter_id: 2,
  jadwal_id: 5,
  tgl_kunjungan: '2026-11-23',
  no_antrean: 1,
  status: 'menunggu' as const,
  pasien: {
    id: 10,
    no_rm: 'RM000001',
    nik: '3201010101900001',
    nama: 'Budi Santoso',
    tgl_lahir: '1990-01-01',
    jenis_kelamin: 'L' as const,
  },
  poli: { id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum', tarif_pendaftaran: 25000 },
  dokter: { id: 2, kode: 'DR001', nama: 'dr. Budi Santoso', spesialis: 'Penyakit Dalam' },
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-pendaftaran');
  useAuthStore.setState({ status: 'authenticated', user: pendaftaranUser });

  vi.mocked(poliApi.listPoli).mockResolvedValue({
    items: [
      {
        id: 1,
        kode: 'POLI-UMUM',
        nama: 'Poli Umum',
        prefix_antrean: 'U',
        tarif_pendaftaran: 25000,
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 100, total: 1 },
  });

  // Jadwal untuk semua hari (1..7) agar tanggal hari ini selalu punya jadwal di test
  vi.mocked(jadwalApi.listJadwalDokter).mockResolvedValue({
    items: [1, 2, 3, 4, 5, 6, 7].map((hari) => ({
      id: 5,
      dokter_id: 2,
      poli_id: 1,
      hari,
      hari_nama: 'Senin',
      jam_mulai: '08:00',
      jam_selesai: '12:00',
      kuota: 20,
      is_active: true,
      dokter: { id: 2, kode: 'DR001', nama: 'dr. Budi Santoso', spesialis: 'Penyakit Dalam' },
      poli: { id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum' },
    })),
    meta: { page: 1, per_page: 100, total: 7 },
  });

  vi.mocked(pendaftaranApi.cariPasienPendaftaran).mockResolvedValue([samplePasien]);
  vi.mocked(pendaftaranApi.riwayatKunjunganPasien).mockResolvedValue([]);
  vi.mocked(pendaftaranApi.daftarKunjungan).mockResolvedValue(sampleKunjungan);
  vi.mocked(pendaftaranApi.listAntrean).mockResolvedValue([sampleKunjungan]);
  vi.mocked(pendaftaranApi.ubahStatusAntrean).mockResolvedValue({
    ...sampleKunjungan,
    status: 'diperiksa',
  });
});

describe('PendaftaranPage dan AntreanPage (poin 3.6)', () => {
  it('alur cari pasien, pilih jadwal dokter, daftar kunjungan sampai nomor antrean tampil', async () => {
    renderAt('/transaction/pendaftaran');

    const pasienBtn = await screen.findByRole('button', { name: /Budi Santoso/ });
    await userEvent.click(pasienBtn);

    await userEvent.click(screen.getByRole('button', { name: 'Daftarkan Kunjungan' }));

    expect(pendaftaranApi.daftarKunjungan).toHaveBeenCalled();
    expect(await screen.findByTestId('ticket-no-antrean')).toHaveTextContent('#1');
    expect(screen.getByText('RJ202611230001')).toBeInTheDocument();
  });

  it('halaman antrean menampilkan daftar antrean dan mengubah status menjadi diperiksa', async () => {
    renderAt('/transaction/antrean');

    expect(await screen.findByText('RJ202611230001')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Panggil / Periksa' }));

    expect(pendaftaranApi.ubahStatusAntrean).toHaveBeenCalledWith(100, 'diperiksa');
  });
});
