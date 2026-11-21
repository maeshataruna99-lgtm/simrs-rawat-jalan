/**
 * Uji pembangkit file Excel SpreadsheetML multi-sheet untuk laporan dashboard.
 */
import { describe, expect, it } from 'vitest';
import { createDashboardExcelXml } from '@/lib/export-excel';

describe('export-excel', () => {
  it('menghasilkan workbook SpreadsheetML multi-sheet dengan escaping XML aman', () => {
    const xml = createDashboardExcelXml({
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
      perPoli: [{ poli_id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum & Anak', jumlah_kunjungan: 16 }],
      tindakan: [
        {
          tindakan_id: 1,
          kode: 'T01',
          nama: 'Konsultasi',
          jumlah_kali: 10,
          total_qty: 12,
          total_nilai: 600000,
        },
      ],
      pendapatan: {
        periode: { from: '2026-11-01', to: '2026-11-22' },
        per_hari: [{ tanggal: '2026-11-22', jumlah_transaksi: 2, total_pendapatan: 200000 }],
        per_sumber: [{ sumber: 'tindakan', total_nilai: 600000 }],
      },
      obat: [
        {
          obat_id: 1,
          kode: 'OB1',
          nama: 'Paracetamol',
          satuan: 'tablet',
          total_jumlah: 100,
          total_nilai: 150000,
        },
      ],
      pembayaran: {
        periode: { from: '2026-11-01', to: '2026-11-22' },
        per_status: [
          { status: 'lunas', jumlah_invoice: 49, total_tagihan: 9000000, total_bayar: 9000000 },
        ],
        per_metode: [{ metode: 'tunai', jumlah_transaksi: 25, total_bayar: 4800000 }],
      },
    });

    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('ss:Name="Ringkasan"');
    expect(xml).toContain('ss:Name="Kunjungan per Poli"');
    expect(xml).toContain('ss:Name="Penggunaan Obat"');
    expect(xml).toContain('Poli Umum &amp; Anak');
    expect(xml).toContain('<Data ss:Type="Number">9611000</Data>');
  });
});
