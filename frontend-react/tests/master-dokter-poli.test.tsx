/**
 * Uji halaman master dokter (/master/dokter) dan poli (/master/poli) — poin 2.11.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as dokterApi from '@/modules/master/dokter/dokter.api';
import * as poliApi from '@/modules/master/poli/poli.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { renderAt } from './render';

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
    'master-dokter': fullPerm,
    'master-poli': fullPerm,
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-admin');
  useAuthStore.setState({ status: 'authenticated', user: adminProfile });

  vi.mocked(dokterApi.listDokter).mockResolvedValue({
    items: [
      {
        id: 1,
        kode: 'DR001',
        nama: 'dr. Budi Santoso',
        sip: 'SIP/001/2026',
        spesialis: 'Penyakit Dalam',
        jenis_tenaga: 'dokter',
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });

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
    meta: { page: 1, per_page: 20, total: 1 },
  });
});

describe('DokterPage dan PoliPage (poin 2.11)', () => {
  it('menampilkan daftar dokter dan menambahkan tenaga medis baru', async () => {
    vi.mocked(dokterApi.createDokter).mockResolvedValue({
      id: 2,
      kode: 'PR001',
      nama: 'Ns. Rina',
      sip: 'SIPP/001',
      spesialis: null,
      jenis_tenaga: 'perawat',
      is_active: true,
    });

    renderAt('/master/dokter');
    expect(await screen.findByText('dr. Budi Santoso')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Tenaga Medis' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Kode'), 'PR001');
    await userEvent.selectOptions(within(dialog).getByLabelText('Jenis Tenaga'), 'perawat');
    await userEvent.type(within(dialog).getByLabelText('Nama'), 'Ns. Rina');
    await userEvent.type(within(dialog).getByLabelText('Nomor SIP'), 'SIPP/001');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(dokterApi.createDokter).toHaveBeenCalledWith({
      kode: 'PR001',
      nama: 'Ns. Rina',
      sip: 'SIPP/001',
      spesialis: null,
      jenis_tenaga: 'perawat',
      is_active: true,
    });
  });

  it('menampilkan daftar poli beserta format tarif Rupiah dan menyimpan poli baru', async () => {
    vi.mocked(poliApi.createPoli).mockResolvedValue({
      id: 2,
      kode: 'POLI-GIGI',
      nama: 'Poli Gigi',
      prefix_antrean: 'G',
      tarif_pendaftaran: 30000,
      is_active: true,
    });

    renderAt('/master/poli');
    expect(await screen.findByText('Poli Umum')).toBeInTheDocument();
    expect(screen.getByText('Rp 25.000')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Poli' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Kode'), 'POLI-GIGI');
    await userEvent.type(within(dialog).getByLabelText('Nama'), 'Poli Gigi');
    await userEvent.type(within(dialog).getByLabelText('Prefix Antrean'), 'g');
    await userEvent.type(within(dialog).getByLabelText('Tarif Pendaftaran'), '30000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(poliApi.createPoli).toHaveBeenCalledWith({
      kode: 'POLI-GIGI',
      nama: 'Poli Gigi',
      prefix_antrean: 'G',
      tarif_pendaftaran: 30000,
      is_active: true,
    });
  });
});
