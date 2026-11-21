/**
 * Uji pembangkit dokumen PDF 1.4 sisi klien untuk invoice dan laporan dashboard.
 */
import { describe, expect, it } from 'vitest';
import { createDashboardPdfBytes, createInvoicePdfBytes } from '@/lib/export-pdf';

describe('export-pdf', () => {
  it('menghasilkan dokumen PDF 1.4 valid berisi rincian invoice', () => {
    const bytes = createInvoicePdfBytes({
      id: 1,
      no_invoice: 'INV202611220001',
      kunjungan_id: 2,
      total: 100000,
      total_bayar: 100000,
      sisa_tagihan: 0,
      status: 'lunas',
      created_at: '2026-11-22 09:00:00',
      updated_at: null,
      kunjungan: {
        id: 2,
        no_kunjungan: 'RJ202611220001',
        tgl_kunjungan: '2026-11-22',
        status: 'selesai',
      },
      pasien: { id: 3, no_rm: 'RM000003', nama: 'Budi Santoso', nik: '3201010101900003' },
      poli: { id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum' },
      dokter: { id: 1, nama: 'dr. Budi' },
      items: [
        {
          id: 10,
          invoice_id: 1,
          sumber: 'pendaftaran',
          referensi_id: 2,
          deskripsi: 'Biaya Pendaftaran',
          qty: 1,
          harga: 25000,
          subtotal: 25000,
          is_void: false,
          alasan_void: null,
          created_at: '2026-11-22 09:00:00',
        },
      ],
      pembayaran: [],
    });

    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('INV202611220001');
    expect(text).toContain('Budi Santoso');
    expect(text).toContain('Biaya Pendaftaran');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('menghasilkan dokumen PDF 1.4 valid berisi ringkasan laporan dashboard', () => {
    const bytes = createDashboardPdfBytes({
      from: '2026-11-01',
      to: '2026-11-22',
      summary: {
        periode: { from: '2026-11-01', to: '2026-11-22' },
        total_kunjungan: 60,
        total_tindakan: 71,
        total_pendapatan: 9611000,
        total_tagihan: 11030000,
        invoice_per_status: { belum_dibayar: 5, dibayar_sebagian: 5, lunas: 49 },
      },
      perPoli: [{ poli_id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum', jumlah_kunjungan: 16 }],
      tindakan: [],
      obat: [],
    });

    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('LAPORAN DASHBOARD');
    expect(text).toContain('2026-11-01 s/d 2026-11-22');
    expect(text).toContain('Poli Umum');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });
});
