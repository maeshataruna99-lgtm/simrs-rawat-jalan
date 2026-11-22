/**
 * Uji halaman master obat dan stok (/master/obat) — poin 2.14.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as obatApi from '@/modules/master/obat/obat.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { renderAt } from './render';

vi.mock('@/modules/master/obat/obat.api');

const fullPerm = { read: true, create: true, update: true, delete: true };

const adminProfile: UserProfile = {
  id: 1,
  username: 'admin',
  nama: 'Administrator',
  dokter_id: null,
  role: { id: 1, kode: 'admin', nama: 'Administrator' },
  modules: [],
  permissions: {
    'master-obat': fullPerm,
  },
};

const sampleObat = {
  id: 1,
  kode: 'OBT001',
  nama: 'Paracetamol 500mg',
  satuan: 'tablet',
  harga: 1500,
  stok: 50,
  is_active: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-admin');
  useAuthStore.setState({ status: 'authenticated', user: adminProfile });

  vi.mocked(obatApi.listObat).mockResolvedValue({
    items: [sampleObat],
    meta: { page: 1, per_page: 20, total: 1 },
  });
});

describe('ObatPage (/master/obat)', () => {
  it('menyesuaikan stok obat dan menampilkan riwayat mutasi per obat', async () => {
    vi.mocked(obatApi.adjustObatStok).mockResolvedValue({ ...sampleObat, stok: 80 });
    vi.mocked(obatApi.listObatMutasi).mockResolvedValue([
      {
        id: 10,
        obat_id: 1,
        jenis: 'penyesuaian',
        qty: 30,
        stok_sebelum: 50,
        stok_sesudah: 80,
        referensi: 'Opname gudang',
        created_at: '2026-11-21 10:00:00',
        petugas: 'Dewi Apoteker',
      },
    ]);

    renderAt('/master/obat');
    expect(await screen.findByText('Paracetamol 500mg')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sesuaikan Stok' }));
    const adjustDialog = await screen.findByRole('dialog');
    const stokInput = within(adjustDialog).getByLabelText('Stok Baru');
    await userEvent.clear(stokInput);
    await userEvent.type(stokInput, '80');
    await userEvent.type(
      within(adjustDialog).getByLabelText('Keterangan / Referensi'),
      'Opname gudang',
    );
    await userEvent.click(within(adjustDialog).getByRole('button', { name: 'Simpan' }));

    expect(obatApi.adjustObatStok).toHaveBeenCalledWith(1, {
      stok_baru: 80,
      referensi: 'Opname gudang',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Riwayat Mutasi' }));
    const historyDialog = await screen.findByRole('dialog');
    expect(await within(historyDialog).findByText('Opname gudang')).toBeInTheDocument();
    expect(within(historyDialog).getByText('+30')).toBeInTheDocument();
  });
});
