/**
 * Uji halaman worklist dokter, form pemeriksaan bertab, dan riwayat rekam medis — poin 4.6.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as icd10Api from '@/modules/master/icd10/icd10.api';
import * as obatApi from '@/modules/master/obat/obat.api';
import * as masterTindakanApi from '@/modules/master/tindakan/tindakan.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as pemeriksaanApi from '@/modules/transaction/pemeriksaan/pemeriksaan.api';
import * as resepApi from '@/modules/transaction/resep/resep.api';
import * as tindakanApi from '@/modules/transaction/tindakan/tindakan.api';
import { renderAt } from './render';

vi.mock('@/modules/transaction/pemeriksaan/pemeriksaan.api');
vi.mock('@/modules/transaction/pendaftaran/pendaftaran.api');
vi.mock('@/modules/master/icd10/icd10.api');
vi.mock('@/modules/master/tindakan/tindakan.api');
vi.mock('@/modules/transaction/tindakan/tindakan.api');
vi.mock('@/modules/transaction/resep/resep.api');
vi.mock('@/modules/master/obat/obat.api');

const fullPerm = { read: true, create: true, update: true, delete: true };

const dokterUser: UserProfile = {
  id: 3,
  username: 'dokter',
  nama: 'dr. Budi Santoso',
  dokter_id: 2,
  role: { id: 3, kode: 'dokter', nama: 'Dokter' },
  modules: [],
  permissions: { pemeriksaan: fullPerm, antrean: fullPerm, 'riwayat-medis': fullPerm },
};

const kunjungan = {
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
    nama: 'Budi Pasien',
    tgl_lahir: '1990-01-01',
    jenis_kelamin: 'L' as const,
  },
  poli: { id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum', tarif_pendaftaran: 25000 },
  dokter: { id: 2, kode: 'DR001', nama: 'dr. Budi Santoso', spesialis: null },
};

const pemeriksaanTersimpan = {
  keluhan_utama: 'Demam 3 hari',
  anamnesis: null,
  td_sistolik: 120,
  td_diastolik: 80,
  nadi: null,
  suhu: 38.5,
  respirasi: null,
  spo2: null,
  berat_badan: null,
  tinggi_badan: null,
  pemeriksaan_fisik: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-dokter');
  useAuthStore.setState({ status: 'authenticated', user: dokterUser });

  vi.mocked(pemeriksaanApi.worklist).mockResolvedValue([kunjungan]);
  vi.mocked(pemeriksaanApi.detailPemeriksaan).mockResolvedValue({
    kunjungan,
    pemeriksaan: null,
    diagnosis: [],
  });
  vi.mocked(pemeriksaanApi.simpanPemeriksaan).mockResolvedValue(pemeriksaanTersimpan);
  vi.mocked(pemeriksaanApi.simpanDiagnosis).mockResolvedValue([]);
  vi.mocked(pemeriksaanApi.riwayatMedis).mockResolvedValue([
    {
      kunjungan: { ...kunjungan, status: 'diperiksa' },
      pemeriksaan: pemeriksaanTersimpan,
      diagnosis: [
        {
          id: 1,
          kunjungan_id: 100,
          icd10_id: 7,
          jenis: 'utama',
          icd10: { id: 7, kode: 'A01.0', nama: 'Demam tifoid' },
        },
      ],
      tindakan: [],
      resep: [],
    },
  ]);
  vi.mocked(pemeriksaanApi.cariPasienRiwayat).mockResolvedValue([
    { ...kunjungan.pasien, alamat: null, no_hp: null },
  ]);
  vi.mocked(masterTindakanApi.listTindakan).mockResolvedValue({
    items: [
      {
        id: 3,
        kode: 'TND01',
        nama: 'Nebulizer',
        tarif: 75000,
        poli_id: null,
        is_active: true,
        poli: null,
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });
  vi.mocked(tindakanApi.daftarTindakan).mockResolvedValue({ items: [], total: 0 });
  vi.mocked(tindakanApi.tambahTindakan).mockResolvedValue({
    id: 1,
    kunjungan_id: 100,
    tindakan_id: 3,
    qty: 2,
    tarif: 75000,
    subtotal: 150000,
    status: 'aktif',
    tindakan: { id: 3, kode: 'TND01', nama: 'Nebulizer' },
  });
  vi.mocked(resepApi.daftarResep).mockResolvedValue([]);
  vi.mocked(obatApi.listObat).mockResolvedValue({
    items: [
      {
        id: 9,
        kode: 'OBT01',
        nama: 'Paracetamol',
        satuan: 'tablet',
        harga: 500,
        stok: 3,
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });
  vi.mocked(icd10Api.listIcd10).mockResolvedValue({
    items: [{ id: 7, kode: 'A01.0', nama: 'Demam tifoid', is_active: true }],
    meta: { page: 1, per_page: 20, total: 1 },
  });
});

describe('Pemeriksaan dokter (poin 4.6)', () => {
  it('worklist menampilkan pasien dan tombol periksa membuka form', async () => {
    renderAt('/transaction/pemeriksaan');

    expect(await screen.findByText('Budi Pasien')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Periksa' }));

    expect(await screen.findByRole('tab', { name: 'Tanda Vital' })).toBeInTheDocument();
    expect(pemeriksaanApi.detailPemeriksaan).toHaveBeenCalledWith(100);
  });

  it('form menolak tanda vital di luar range lalu menyimpan nilai valid sebagai angka', async () => {
    renderAt('/transaction/pemeriksaan/100');

    await userEvent.type(await screen.findByLabelText('Keluhan utama'), 'Demam 3 hari');
    await userEvent.click(screen.getByRole('tab', { name: 'Tanda Vital' }));
    await userEvent.type(screen.getByLabelText('Suhu (°C)'), '50');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Pemeriksaan' }));

    expect(await screen.findByText('Nilai harus antara 30 dan 45.')).toBeInTheDocument();
    expect(pemeriksaanApi.simpanPemeriksaan).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('Suhu (°C)'));
    await userEvent.type(screen.getByLabelText('Suhu (°C)'), '38.5');
    await userEvent.type(screen.getByLabelText('Sistolik (mmHg)'), '120');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Pemeriksaan' }));

    expect(pemeriksaanApi.simpanPemeriksaan).toHaveBeenCalledWith(
      100,
      expect.objectContaining({
        keluhan_utama: 'Demam 3 hari',
        suhu: 38.5,
        td_sistolik: 120,
        nadi: null,
      }),
    );
  });

  it('diagnosis dipilih dari ICD-10 sebagai utama lalu disimpan, riwayat tampil di tab riwayat', async () => {
    renderAt('/transaction/pemeriksaan/100');

    await userEvent.click(await screen.findByRole('tab', { name: 'Diagnosis' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Tambah diagnosis ICD-10...' }));
    await userEvent.click(await screen.findByText('A01.0 — Demam tifoid'));
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Diagnosis' }));

    expect(pemeriksaanApi.simpanDiagnosis).toHaveBeenCalledWith(100, [
      { icd10_id: 7, jenis: 'utama' },
    ]);

    await userEvent.click(screen.getByRole('tab', { name: 'Riwayat' }));
    const item = await screen.findByTestId('riwayat-medis-item');
    expect(within(item).getByText('Demam tifoid')).toBeInTheDocument();
    expect(within(item).getByText('Kunjungan ini')).toBeInTheDocument();
  });

  it('panel tindakan menambahkan tindakan dengan jumlah lalu menampilkan tarif dan total', async () => {
    renderAt('/transaction/pemeriksaan/100');

    await userEvent.click(await screen.findByRole('tab', { name: 'Tindakan' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Pilih tindakan medis...' }));
    await userEvent.click(await screen.findByText('TND01 — Nebulizer'));
    await userEvent.clear(screen.getByLabelText('Jumlah'));
    await userEvent.type(screen.getByLabelText('Jumlah'), '2');

    vi.mocked(tindakanApi.daftarTindakan).mockResolvedValue({
      items: [
        {
          id: 1,
          kunjungan_id: 100,
          tindakan_id: 3,
          qty: 2,
          tarif: 75000,
          subtotal: 150000,
          status: 'aktif',
          tindakan: { id: 3, kode: 'TND01', nama: 'Nebulizer' },
        },
      ],
      total: 150000,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(tindakanApi.tambahTindakan).toHaveBeenCalledWith(100, { tindakan_id: 3, qty: 2 });
    expect(await screen.findByTestId('tindakan-total')).toHaveTextContent('Rp 150.000');
    expect(screen.getByText('Nebulizer')).toBeInTheDocument();
  });

  it('panel resep menampilkan stok saat memilih obat dan menampilkan pesan stok kurang dari server', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    vi.mocked(resepApi.buatResep).mockRejectedValue(
      new AxiosError('422', '422', undefined, undefined, {
        status: 422,
        statusText: 'Unprocessable',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          success: false,
          message: 'Validasi gagal',
          errors: { 'items.0': ['Stok Paracetamol tidak cukup (tersedia 3 tablet).'] },
        },
      }),
    );
    renderAt('/transaction/pemeriksaan/100');

    await userEvent.click(await screen.findByRole('tab', { name: 'Resep' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Tambah obat ke resep...' }));
    expect(await screen.findByText('Stok 3 tablet · Rp 500')).toBeInTheDocument();
    await userEvent.click(screen.getByText('OBT01 — Paracetamol'));

    await userEvent.type(screen.getByLabelText('Dosis Paracetamol'), '500mg');
    await userEvent.type(screen.getByLabelText('Frekuensi Paracetamol'), '3x1');
    await userEvent.clear(screen.getByLabelText('Jumlah Paracetamol'));
    await userEvent.type(screen.getByLabelText('Jumlah Paracetamol'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Simpan Resep' }));

    expect(resepApi.buatResep).toHaveBeenCalledWith({
      kunjungan_id: 100,
      catatan: '',
      items: [{ obat_id: 9, dosis: '500mg', frekuensi: '3x1', jumlah: 5 }],
    });
    expect(
      await screen.findByText('Stok Paracetamol tidak cukup (tersedia 3 tablet).'),
    ).toBeInTheDocument();
  });

  it('halaman riwayat rekam medis menampilkan kunjungan pasien terpilih', async () => {
    renderAt('/transaction/riwayat-medis');

    await userEvent.click(await screen.findByRole('combobox', { name: 'Pilih pasien...' }));
    await userEvent.click(await screen.findByText('Budi Pasien'));

    expect(await screen.findByTestId('riwayat-medis-item')).toBeInTheDocument();
    expect(pemeriksaanApi.riwayatMedis).toHaveBeenCalledWith(10);
  });
});
