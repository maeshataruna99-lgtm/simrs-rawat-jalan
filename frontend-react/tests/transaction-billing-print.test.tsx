/**
 * Uji halaman cetak invoice dan bukti pembayaran (/transaction/billing/invoice/:id/cetak dan pembayaran/:id/cetak) — poin 8.8.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as pembayaranApi from '@/modules/transaction/pembayaran/pembayaran.api';
import { renderAt } from './render';

vi.mock('@/modules/transaction/pembayaran/pembayaran.api');

const kasirUser: UserProfile = {
  id: 6,
  username: 'kasir',
  nama: 'Sari Kasir',
  dokter_id: null,
  role: { id: 6, kode: 'kasir', nama: 'Kasir' },
  modules: [],
  permissions: { billing: { read: true, create: true, update: true, delete: false } },
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-kasir');
  useAuthStore.setState({ status: 'authenticated', user: kasirUser });
});

describe('Halaman cetak invoice dan bukti pembayaran (poin 8.8)', () => {
  it('merender lembar cetak invoice lengkap dan memicu window.print', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    vi.mocked(pembayaranApi.getInvoice).mockResolvedValue({
      id: 11,
      no_invoice: 'INV202611220001',
      kunjungan_id: 21,
      total: 100000,
      total_bayar: 100000,
      sisa_tagihan: 0,
      status: 'lunas',
      created_at: '2026-11-22 09:00:00',
      updated_at: null,
      kunjungan: {
        id: 21,
        no_kunjungan: 'RJ202611220001',
        tgl_kunjungan: '2026-11-22',
        status: 'selesai',
      },
      pasien: { id: 31, no_rm: 'RM000031', nama: 'Budi Cetak', nik: '3201010101900031' },
      poli: { id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum' },
      dokter: { id: 2, nama: 'dr. Santi' },
      items: [
        {
          id: 101,
          invoice_id: 11,
          sumber: 'pendaftaran',
          referensi_id: 21,
          deskripsi: 'Biaya Pendaftaran - Poli Umum',
          qty: 1,
          harga: 25000,
          subtotal: 25000,
          is_void: false,
          alasan_void: null,
          created_at: '2026-11-22 09:00:00',
        },
        {
          id: 102,
          invoice_id: 11,
          sumber: 'tindakan',
          referensi_id: 55,
          deskripsi: 'Konsultasi Dokter',
          qty: 1,
          harga: 75000,
          subtotal: 75000,
          is_void: false,
          alasan_void: null,
          created_at: '2026-11-22 09:00:00',
        },
      ],
      pembayaran: [
        {
          id: 501,
          no_pembayaran: 'PAY202611220001',
          invoice_id: 11,
          idempotency_key: 'idem-1',
          metode: 'tunai',
          jumlah: 100000,
          no_referensi: null,
          total_bayar_saat_itu: 100000,
          kasir_id: 6,
          dibayar_at: '2026-11-22 09:10:00',
          created_at: '2026-11-22 09:10:00',
          kasir: { id: 6, username: 'kasir', nama: 'Sari Kasir' },
        },
      ],
    });

    renderAt('/transaction/billing/invoice/11/cetak');

    expect(await screen.findByText('INV202611220001')).toBeInTheDocument();
    expect(screen.getByText('Biaya Pendaftaran - Poli Umum')).toBeInTheDocument();
    expect(screen.getByText('Konsultasi Dokter')).toBeInTheDocument();
    expect(screen.getByText('PAY202611220001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cetak' }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('merender lembar cetak bukti pembayaran lengkap dan memicu window.print', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    vi.mocked(pembayaranApi.getPembayaran).mockResolvedValue({
      id: 501,
      no_pembayaran: 'PAY202611220001',
      invoice_id: 11,
      idempotency_key: 'idem-1',
      metode: 'non_tunai',
      jumlah: 60000,
      no_referensi: 'TRF-88',
      total_bayar_saat_itu: 60000,
      kasir_id: 6,
      dibayar_at: '2026-11-22 09:15:00',
      created_at: '2026-11-22 09:15:00',
      kasir: { id: 6, username: 'kasir', nama: 'Sari Kasir' },
      invoice: {
        id: 11,
        no_invoice: 'INV202611220001',
        kunjungan_id: 21,
        total: 100000,
        total_bayar: 100000,
        sisa_tagihan: 0,
        status: 'lunas',
        kunjungan: { id: 21, no_kunjungan: 'RJ202611220001', tgl_kunjungan: '2026-11-22' },
        pasien: { id: 31, no_rm: 'RM000031', nama: 'Budi Cetak' },
        poli: { id: 1, nama: 'Poli Umum' },
        dokter: { id: 2, nama: 'dr. Santi' },
      },
    });

    renderAt('/transaction/billing/pembayaran/501/cetak');

    expect(await screen.findByText('PAY202611220001')).toBeInTheDocument();
    expect(screen.getByText('INV202611220001')).toBeInTheDocument();
    expect(screen.getByText('TRF-88')).toBeInTheDocument();
    expect(screen.getByText('Rp 60.000')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cetak' }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
