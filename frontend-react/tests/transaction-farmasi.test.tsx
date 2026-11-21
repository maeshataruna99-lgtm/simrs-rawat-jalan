/**
 * Uji halaman antrean dan penyerahan resep farmasi (/transaction/farmasi) — poin 6.7.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as resepApi from '@/modules/transaction/resep/resep.api';
import type { ResepItem } from '@/modules/transaction/resep/resep.api';
import { renderAt } from './render';

vi.mock('@/modules/transaction/resep/resep.api');

const farmasiUser: UserProfile = {
  id: 4,
  username: 'farmasi',
  nama: 'Dewi Apoteker',
  dokter_id: null,
  role: { id: 4, kode: 'farmasi', nama: 'Petugas Farmasi' },
  modules: [],
  permissions: { farmasi: { read: true, create: true, update: true, delete: false } },
};

const resep = (id: number, status: ResepItem['status']): ResepItem => ({
  id,
  no_resep: `RSP20261121000${id}`,
  kunjungan_id: 100,
  status,
  catatan: null,
  diserahkan_at: null,
  created_at: '2026-11-21 09:00:00',
  total: 1500,
  dokter: { id: 2, nama: 'dr. Budi Santoso' },
  pasien: { id: 10, no_rm: 'RM000001', nama: `Pasien ${id}` },
  poli: { id: 1, nama: 'Poli Umum' },
  details: [
    {
      id: id * 10,
      obat_id: 9,
      dosis: '500mg',
      frekuensi: '3x1',
      jumlah: 3,
      harga: 500,
      subtotal: 1500,
      obat: { id: 9, kode: 'OBT01', nama: 'Paracetamol', satuan: 'tablet', stok: 10 },
    },
  ],
});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-farmasi');
  useAuthStore.setState({ status: 'authenticated', user: farmasiUser });
  vi.mocked(resepApi.antreanFarmasi).mockResolvedValue([resep(1, 'baru'), resep(2, 'diproses')]);
  vi.mocked(resepApi.ubahStatusResep).mockResolvedValue(resep(1, 'diproses'));
});

describe('FarmasiPage (poin 6.7)', () => {
  it('resep baru diproses dan resep diproses diserahkan', async () => {
    renderAt('/transaction/farmasi');

    expect(await screen.findByText('Pasien 1')).toBeInTheDocument();
    expect(screen.getAllByText(/Paracetamol · 3 tablet/)).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Proses' }));
    expect(resepApi.ubahStatusResep).toHaveBeenCalledWith(1, 'proses');

    await userEvent.click(await screen.findByRole('button', { name: 'Serahkan' }));
    expect(resepApi.ubahStatusResep).toHaveBeenCalledWith(2, 'serahkan');
  });

  it('filter status mengirim status ke antrean farmasi', async () => {
    renderAt('/transaction/farmasi');
    await screen.findByText('Pasien 1');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'diserahkan');
    expect(resepApi.antreanFarmasi).toHaveBeenLastCalledWith({ status: 'diserahkan' });
  });
});
