/**
 * Uji halaman billing, pembayaran bertahap/lunas, Idempotency-Key retry, dan riwayat pembayaran (poin 8.7).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as pembayaranApi from '@/modules/transaction/pembayaran/pembayaran.api';
import type { Invoice, PembayaranRingkas } from '@/modules/transaction/pembayaran/pembayaran.types';
import { renderAt } from './render';

vi.mock('@/modules/transaction/pembayaran/pembayaran.api');

const kasirUser: UserProfile = {
  id: 6,
  username: 'kasir',
  nama: 'Rudi Kasir',
  dokter_id: null,
  role: { id: 6, kode: 'kasir', nama: 'Kasir' },
  modules: [],
  permissions: { billing: { read: true, create: true, update: true, delete: false } },
};

const buatInvoiceFixture = (
  status: Invoice['status'],
  totalBayar: number,
  pembayaran: PembayaranRingkas[] = [],
): Invoice => ({
  id: 11,
  no_invoice: 'INV202611220001',
  kunjungan_id: 21,
  total: 100000,
  total_bayar: totalBayar,
  sisa_tagihan: 100000 - totalBayar,
  status,
  created_at: '2026-11-22 09:00:00',
  updated_at: null,
  kunjungan: {
    id: 21,
    no_kunjungan: 'RJ202611220001',
    tgl_kunjungan: '2026-11-22',
    status: 'selesai',
    is_valid: true,
  },
  pasien: { id: 31, no_rm: 'RM000031', nama: 'Budi Billing', nik: '3201010101900031' },
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
  pembayaran,
});

const pembayaranSatu: PembayaranRingkas = {
  id: 501,
  no_pembayaran: 'PAY202611220001',
  invoice_id: 11,
  idempotency_key: 'idem-1',
  metode: 'tunai',
  jumlah: 40000,
  no_referensi: null,
  total_bayar_saat_itu: 40000,
  kasir_id: 6,
  dibayar_at: '2026-11-22 09:10:00',
  created_at: '2026-11-22 09:10:00',
  kasir: { id: 6, username: 'kasir', nama: 'Rudi Kasir' },
  invoice: {
    id: 11,
    no_invoice: 'INV202611220001',
    kunjungan_id: 21,
    total: 100000,
    total_bayar: 40000,
    sisa_tagihan: 60000,
    status: 'dibayar_sebagian',
    kunjungan: { id: 21, no_kunjungan: 'RJ202611220001', tgl_kunjungan: '2026-11-22' },
    pasien: { id: 31, no_rm: 'RM000031', nama: 'Budi Billing' },
    poli: { id: 1, nama: 'Poli Umum' },
    dokter: { id: 2, nama: 'dr. Santi' },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-kasir');
  useAuthStore.setState({ status: 'authenticated', user: kasirUser });
  vi.mocked(pembayaranApi.listInvoice).mockResolvedValue({
    items: [buatInvoiceFixture('belum_dibayar', 0)],
    meta: { page: 1, per_page: 20, total: 1 },
  });
  vi.mocked(pembayaranApi.listBelumTagih).mockResolvedValue({
    items: [],
    meta: { page: 1, per_page: 20, total: 0 },
  });
  vi.mocked(pembayaranApi.listPembayaran).mockResolvedValue({
    items: [pembayaranSatu],
    meta: { page: 1, per_page: 20, total: 1 },
  });
  vi.mocked(pembayaranApi.getAuditLogInvoice).mockResolvedValue([]);
  let keySeq = 0;
  vi.mocked(pembayaranApi.buatIdempotencyKey).mockImplementation(() => `idem-test-${++keySeq}`);
});

describe('BillingPage (poin 8.7)', () => {
  it('kasir bisa membayar sebagian lalu melunasi dan memakai ulang Idempotency-Key saat retry', async () => {
    const user = userEvent.setup();
    const invSebagian = buatInvoiceFixture('dibayar_sebagian', 40000, [pembayaranSatu]);
    const invLunas = buatInvoiceFixture('lunas', 100000, [pembayaranSatu]);

    vi.mocked(pembayaranApi.bayarInvoice)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ pembayaran: pembayaranSatu, invoice: invSebagian })
      .mockResolvedValueOnce({
        pembayaran: { ...pembayaranSatu, id: 502, no_pembayaran: 'PAY202611220002', jumlah: 60000 },
        invoice: invLunas,
      });

    vi.mocked(pembayaranApi.listInvoice)
      .mockResolvedValueOnce({
        items: [buatInvoiceFixture('belum_dibayar', 0)],
        meta: { page: 1, per_page: 20, total: 1 },
      })
      .mockResolvedValueOnce({
        items: [invSebagian],
        meta: { page: 1, per_page: 20, total: 1 },
      })
      .mockResolvedValueOnce({
        items: [invLunas],
        meta: { page: 1, per_page: 20, total: 1 },
      });

    renderAt('/transaction/billing');
    expect(await screen.findByText('INV202611220001')).toBeInTheDocument();

    // Buka dialog bayar pertama (cicilan 40.000)
    await user.click(screen.getByRole('button', { name: 'Bayar' }));
    const jumlahInput = screen.getByLabelText('Jumlah Bayar');
    await user.clear(jumlahInput);
    await user.type(jumlahInput, '40000');

    // Submit 1 gagal jaringan, submit 2 retry -> harus mengirim Idempotency-Key yang sama!
    await user.click(screen.getByRole('button', { name: 'Proses Pembayaran' }));
    await waitFor(() => expect(pembayaranApi.bayarInvoice).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Proses Pembayaran' }));
    await waitFor(() => expect(pembayaranApi.bayarInvoice).toHaveBeenCalledTimes(2));

    const key1 = vi.mocked(pembayaranApi.bayarInvoice).mock.calls[0][1];
    const key2 = vi.mocked(pembayaranApi.bayarInvoice).mock.calls[1][1];
    expect(key1).toBeTruthy();
    expect(key2).toBe(key1);

    // Status berubah menjadi Dibayar Sebagian, lalu lunasi sisa 60.000 dengan metode non-tunai
    const table = screen.getByRole('table');
    expect(await within(table).findByText('Dibayar Sebagian')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bayar' }));
    await user.selectOptions(screen.getByLabelText('Metode Pembayaran'), 'non_tunai');
    await user.type(screen.getByLabelText('No. Referensi'), 'QRIS-123');
    await user.click(screen.getByRole('button', { name: 'Proses Pembayaran' }));

    await waitFor(() => expect(pembayaranApi.bayarInvoice).toHaveBeenCalledTimes(3));
    const key3 = vi.mocked(pembayaranApi.bayarInvoice).mock.calls[2][1];
    expect(key3).not.toBe(key1);
    expect(await within(table).findByText('Lunas')).toBeInTheDocument();
  });

  it('menampilkan tab riwayat pembayaran', async () => {
    const user = userEvent.setup();
    renderAt('/transaction/billing');
    expect(await screen.findByText('INV202611220001')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Riwayat Pembayaran' }));
    expect(await screen.findByText('PAY202611220001')).toBeInTheDocument();
  });

  it('buat invoice menampilkan peringatan merah transaksi belum selesai sebelum kasir melanjutkan', async () => {
    const user = userEvent.setup();
    vi.mocked(pembayaranApi.listBelumTagih).mockResolvedValue({
      items: [
        {
          id: 77,
          no_kunjungan: 'RJ202611240077',
          tgl_kunjungan: '2026-11-24',
          no_antrean: 3,
          status: 'diperiksa',
          pasien: { id: 31, no_rm: 'RM000031', nama: 'Budi Billing' },
          poli: { id: 1, kode: 'UMUM', nama: 'Poli Umum' },
          dokter: { id: 2, nama: 'dr. Santi' },
        },
      ],
      meta: { page: 1, per_page: 20, total: 1 },
    });
    vi.mocked(pembayaranApi.peringatanKunjungan).mockResolvedValue([
      'Order laboratorium LAB202611240001 belum selesai (status diminta).',
    ]);
    vi.mocked(pembayaranApi.buatInvoice).mockResolvedValue(buatInvoiceFixture('belum_dibayar', 0));

    renderAt('/transaction/billing');
    await user.click(await screen.findByRole('tab', { name: 'Belum Ditagih' }));
    await user.click(await screen.findByRole('button', { name: 'Buat Invoice' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(await within(dialog).findByText(/LAB202611240001 belum selesai/)).toBeInTheDocument();
    expect(pembayaranApi.peringatanKunjungan).toHaveBeenCalledWith(77);
    expect(pembayaranApi.buatInvoice).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Tetap Lanjutkan' }));
    await waitFor(() => expect(pembayaranApi.buatInvoice).toHaveBeenCalledWith(77));
  });

  it('invoice valid menampilkan tombol Unvalid untuk membuka kunci kunjungan', async () => {
    const user = userEvent.setup();
    vi.mocked(pembayaranApi.ubahValidasi).mockResolvedValue(buatInvoiceFixture('belum_dibayar', 0));
    renderAt('/transaction/billing');

    expect(await screen.findByText('Valid (terkunci)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unvalid' }));
    await waitFor(() => expect(pembayaranApi.ubahValidasi).toHaveBeenCalledWith(11, 'unvalid'));
  });
});
