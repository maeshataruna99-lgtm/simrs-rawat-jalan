/**
 * Uji halaman master tindakan (/master/tindakan) dan pemeriksaan laboratorium (/master/pemeriksaan-lab) — poin 2.13.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as labApi from '@/modules/master/lab/lab.api';
import * as poliApi from '@/modules/master/poli/poli.api';
import * as tindakanApi from '@/modules/master/tindakan/tindakan.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { renderAt } from './render';

vi.mock('@/modules/master/tindakan/tindakan.api');
vi.mock('@/modules/master/lab/lab.api');
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
    'master-tindakan': fullPerm,
    'master-pemeriksaan-lab': fullPerm,
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-admin');
  useAuthStore.setState({ status: 'authenticated', user: adminProfile });

  vi.mocked(poliApi.listPoli).mockResolvedValue({
    items: [
      {
        id: 1,
        kode: 'POLI-GIGI',
        nama: 'Poli Gigi',
        prefix_antrean: 'G',
        tarif_pendaftaran: 30000,
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 100, total: 1 },
  });

  vi.mocked(tindakanApi.listTindakan).mockResolvedValue({
    items: [
      {
        id: 1,
        kode: 'TDK001',
        nama: 'Scaling Gigi',
        tarif: 150000,
        poli_id: 1,
        is_active: true,
        poli: { id: 1, kode: 'POLI-GIGI', nama: 'Poli Gigi' },
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });

  vi.mocked(labApi.listPemeriksaanLab).mockResolvedValue({
    items: [
      {
        id: 1,
        kode: 'LAB-HB',
        nama: 'Hemoglobin',
        satuan: 'g/dL',
        nilai_rujukan: '12.0 - 16.0',
        tarif: 45000,
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });
});

describe('TindakanPage dan PemeriksaanLabPage (poin 2.13)', () => {
  it('menampilkan daftar tindakan dan menambah tindakan baru', async () => {
    vi.mocked(tindakanApi.createTindakan).mockResolvedValue({
      id: 2,
      kode: 'TDK002',
      nama: 'Jahit Luka',
      tarif: 75000,
      poli_id: null,
      is_active: true,
      poli: null,
    });

    renderAt('/master/tindakan');
    expect(await screen.findByText('Scaling Gigi')).toBeInTheDocument();
    expect(screen.getByText('Rp 150.000')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Tindakan' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Kode'), 'TDK002');
    await userEvent.type(within(dialog).getByLabelText('Nama'), 'Jahit Luka');
    await userEvent.type(within(dialog).getByLabelText('Tarif'), '75000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(tindakanApi.createTindakan).toHaveBeenCalledWith({
      kode: 'TDK002',
      nama: 'Jahit Luka',
      tarif: 75000,
      poli_id: null,
      is_active: true,
    });
  });

  it('menampilkan daftar pemeriksaan lab beserta nilai rujukan dan menambah pemeriksaan baru', async () => {
    vi.mocked(labApi.createPemeriksaanLab).mockResolvedValue({
      id: 2,
      kode: 'LAB-GDS',
      nama: 'Gula Darah Sewaktu',
      satuan: 'mg/dL',
      nilai_rujukan: '70 - 140',
      tarif: 35000,
      is_active: true,
    });

    renderAt('/master/pemeriksaan-lab');
    expect(await screen.findByText('Hemoglobin')).toBeInTheDocument();
    expect(screen.getByText('12.0 - 16.0')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Pemeriksaan' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Kode'), 'LAB-GDS');
    await userEvent.type(within(dialog).getByLabelText('Nama'), 'Gula Darah Sewaktu');
    await userEvent.type(within(dialog).getByLabelText('Satuan'), 'mg/dL');
    await userEvent.type(within(dialog).getByLabelText('Nilai Rujukan'), '70 - 140');
    await userEvent.type(within(dialog).getByLabelText('Tarif'), '35000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(labApi.createPemeriksaanLab).toHaveBeenCalledWith({
      kode: 'LAB-GDS',
      nama: 'Gula Darah Sewaktu',
      satuan: 'mg/dL',
      nilai_rujukan: '70 - 140',
      tarif: 35000,
      is_active: true,
    });
  });
});
