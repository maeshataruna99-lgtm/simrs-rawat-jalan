/**
 * Uji halaman worklist dan input hasil laboratorium (/transaction/laboratorium) — poin 7.7.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as labApi from '@/modules/transaction/lab/lab.api';
import type { OrderLabItem } from '@/modules/transaction/lab/lab.api';
import { renderAt } from './render';

vi.mock('@/modules/transaction/lab/lab.api');

const labUser: UserProfile = {
  id: 5,
  username: 'laboratorium',
  nama: 'Agus Analis',
  dokter_id: null,
  role: { id: 5, kode: 'laboratorium', nama: 'Petugas Laboratorium' },
  modules: [],
  permissions: { laboratorium: { read: true, create: true, update: true, delete: false } },
};

const order = (hasil: string | null, flag: 'tinggi' | null): OrderLabItem => ({
  id: 5,
  no_order: 'LAB202611210001',
  kunjungan_id: 100,
  status: hasil ? 'selesai' : 'diminta',
  catatan_klinis: 'Curiga DM',
  created_at: '2026-11-21 09:00:00',
  total: 40000,
  dokter: { id: 2, nama: 'dr. Budi Santoso' },
  pasien: { id: 10, no_rm: 'RM000001', nama: 'Siti Aminah' },
  poli: { id: 1, nama: 'Poli Umum' },
  details: [
    {
      id: 11,
      pemeriksaan_lab_id: 1,
      tarif: 40000,
      hasil,
      satuan: 'mg/dL',
      nilai_rujukan: '70-110',
      flag,
      diinput_at: null,
      pemeriksaan: { id: 1, kode: 'LAB01', nama: 'Gula Darah' },
    },
  ],
});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-lab');
  useAuthStore.setState({ status: 'authenticated', user: labUser });
  vi.mocked(labApi.worklistLab).mockResolvedValue([order(null, null)]);
});

describe('LaboratoriumPage (poin 7.7)', () => {
  it('input hasil lalu menampilkan flag tinggi dari server', async () => {
    renderAt('/transaction/laboratorium');

    expect(await screen.findByText('Siti Aminah')).toBeInTheDocument();
    expect(labApi.worklistLab).toHaveBeenCalledWith('diminta,diproses');
    expect(screen.getByText(/Nilai rujukan: 70-110/)).toBeInTheDocument();

    vi.mocked(labApi.simpanHasilLab).mockResolvedValue(order('180', 'tinggi').details[0]);
    vi.mocked(labApi.worklistLab).mockResolvedValue([order('180', 'tinggi')]);
    await userEvent.type(screen.getByLabelText('Hasil Gula Darah'), '180');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(labApi.simpanHasilLab).toHaveBeenCalledWith(11, '180');
    const card = await screen.findByTestId('lab-order');
    expect(await within(card).findByText('Tinggi')).toBeInTheDocument();
    expect(within(card).getByText('Selesai')).toBeInTheDocument();
  });

  it('filter status selesai memuat ulang worklist', async () => {
    renderAt('/transaction/laboratorium');
    await screen.findByText('Siti Aminah');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'selesai');
    expect(labApi.worklistLab).toHaveBeenLastCalledWith('selesai');
  });
});
