/**
 * Pembuat dokumen PDF 1.4 sederhana sisi klien (tanpa dependensi eksternal) untuk export invoice dan laporan dashboard.
 *
 * Dipakai di: InvoicePrintPage.tsx, InvoiceDetailDialog.tsx, DashboardPage.tsx, tests/export-pdf.test.ts.
 */
import { formatRupiah } from '@/lib/format';
import type {
  DashboardSummary,
  KunjunganPerPoliItem,
  ObatUsageItem,
  TindakanTerbanyakItem,
} from '@/modules/dashboard/dashboard.types';
import type { Invoice } from '@/modules/transaction/pembayaran/pembayaran.types';

interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  gapBefore?: number;
}

/** Mengubah teks ke ASCII aman untuk font standar Helvetica PDF 1.4 dan meng-escape karakter kontrol. */
function pdfEscape(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Membangun dokumen PDF 1.4 (ukuran A4 portrait) dari daftar baris teks dengan dukungan banyak halaman otomatis.
 *
 * Dipakai di: exportInvoicePdf(), exportDashboardPdf(), tests/export-pdf.test.ts.
 */
export function buildSimplePdf(lines: PdfLine[]): Uint8Array {
  const pageHeight = 842;
  const marginTop = 48;
  const marginBottom = 48;
  const marginLeft = 42;

  const pages: string[][] = [[]];
  let y = pageHeight - marginTop;

  for (const line of lines) {
    const size = line.size ?? 10;
    const step = size + 5;
    y -= line.gapBefore ?? 0;

    if (y - step < marginBottom) {
      pages.push([]);
      y = pageHeight - marginTop;
    }

    const font = line.bold ? 'F2' : 'F1';
    const cmd = `BT /${font} ${size} Tf ${marginLeft} ${y} Td (${pdfEscape(line.text)}) Tj ET`;
    pages[pages.length - 1].push(cmd);
    y -= step;
  }

  const objects: string[] = [];
  // Obj 1: Catalog, Obj 2: Pages, Obj 3: Helvetica, Obj 4: Helvetica-Bold
  const pageObjNums: number[] = [];
  let nextObj = 5;
  const pageChunks: Array<{ pageObj: number; contentObj: number; stream: string }> = [];

  for (const cmds of pages) {
    const pageObj = nextObj++;
    const contentObj = nextObj++;
    pageObjNums.push(pageObj);
    pageChunks.push({ pageObj, contentObj, stream: cmds.join('\n') });
  }

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageObjNums.length} >>\nendobj\n`,
  );
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  for (const chunk of pageChunks) {
    objects.push(
      `${chunk.pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${chunk.contentObj} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${chunk.contentObj} 0 obj\n<< /Length ${chunk.stream.length} >>\nstream\n${chunk.stream}\nendstream\nendobj\n`,
    );
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

/** Memicu unduhan file biner di browser. */
export function triggerBlobDownload(bytes: Uint8Array | string, mime: string, filename: string) {
  const part = typeof bytes === 'string' ? bytes : new Uint8Array(bytes);
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Membuat konten PDF untuk satu invoice rawat jalan.
 *
 * Dipakai di: exportInvoicePdf(), tests/export-pdf.test.ts.
 */
export function createInvoicePdfBytes(invoice: Invoice): Uint8Array {
  const activeItems = invoice.items.filter((i) => !i.is_void);
  const lines: PdfLine[] = [
    { text: 'SIMRS RAWAT JALAN - INVOICE TAGIHAN', size: 14, bold: true },
    {
      text: `No. Invoice : ${invoice.no_invoice}    |    Status: ${invoice.status.toUpperCase()}`,
      size: 10,
      gapBefore: 4,
    },
    {
      text: `Pasien      : ${invoice.pasien ? `${invoice.pasien.no_rm} - ${invoice.pasien.nama}` : '-'}`,
    },
    {
      text: `Kunjungan   : ${invoice.kunjungan?.no_kunjungan ?? '-'} (${invoice.kunjungan?.tgl_kunjungan ?? '-'})`,
    },
    { text: `Poli/Dokter : ${invoice.poli?.nama ?? '-'} / ${invoice.dokter?.nama ?? '-'}` },
    {
      text: '--------------------------------------------------------------------------------',
      gapBefore: 6,
    },
    { text: 'RINCIAN BIAYA', bold: true },
  ];

  for (const item of activeItems) {
    lines.push({
      text: `[${item.sumber.toUpperCase()}] ${item.deskripsi}  (${item.qty} x ${formatRupiah(item.harga)}) = ${formatRupiah(item.subtotal)}`,
    });
  }

  lines.push(
    {
      text: '--------------------------------------------------------------------------------',
      gapBefore: 6,
    },
    { text: `Total Tagihan : ${formatRupiah(invoice.total)}`, bold: true },
    { text: `Sudah Dibayar : ${formatRupiah(invoice.total_bayar)}` },
    { text: `Sisa Tagihan  : ${formatRupiah(invoice.sisa_tagihan)}`, bold: true },
  );

  if (invoice.pembayaran.length > 0) {
    lines.push({ text: 'RIWAYAT PEMBAYARAN', bold: true, gapBefore: 10 });
    for (const p of invoice.pembayaran) {
      lines.push({
        text: `${p.no_pembayaran} | ${p.dibayar_at} | ${p.metode} | ${formatRupiah(p.jumlah)}${p.no_referensi ? ` (Ref: ${p.no_referensi})` : ''}`,
      });
    }
  }

  return buildSimplePdf(lines);
}

/**
 * Mengunduh invoice dalam format PDF.
 *
 * Dipakai di: InvoicePrintPage.tsx, InvoiceDetailDialog.tsx.
 */
export function exportInvoicePdf(invoice: Invoice): void {
  const bytes = createInvoicePdfBytes(invoice);
  triggerBlobDownload(bytes, 'application/pdf', `invoice-${invoice.no_invoice}.pdf`);
}

/**
 * Membuat konten PDF untuk laporan ringkasan dashboard sesuai periode terpilih.
 *
 * Dipakai di: exportDashboardPdf(), tests/export-pdf.test.ts.
 */
export function createDashboardPdfBytes(params: {
  from: string;
  to: string;
  summary: DashboardSummary | null;
  perPoli: KunjunganPerPoliItem[];
  tindakan: TindakanTerbanyakItem[];
  obat: ObatUsageItem[];
}): Uint8Array {
  const { from, to, summary, perPoli, tindakan, obat } = params;
  const lines: PdfLine[] = [
    { text: 'SIMRS RAWAT JALAN - LAPORAN DASHBOARD', size: 14, bold: true },
    { text: `Periode: ${from} s/d ${to}`, size: 10, gapBefore: 4 },
    {
      text: '--------------------------------------------------------------------------------',
      gapBefore: 6,
    },
    { text: 'RINGKASAN UTAMA', bold: true },
    { text: `Total Kunjungan     : ${summary?.total_kunjungan ?? 0}` },
    { text: `Total Tindakan      : ${summary?.total_tindakan ?? 0}` },
    { text: `Pendapatan Diterima : ${formatRupiah(summary?.total_pendapatan ?? 0)}` },
    { text: `Total Tagihan       : ${formatRupiah(summary?.total_tagihan ?? 0)}` },
    {
      text: `Status Invoice      : Lunas ${summary?.invoice_per_status.lunas ?? 0} | Sebagian ${summary?.invoice_per_status.dibayar_sebagian ?? 0} | Belum ${summary?.invoice_per_status.belum_dibayar ?? 0}`,
    },
    { text: 'KUNJUNGAN PER POLI', bold: true, gapBefore: 10 },
    ...(perPoli.length > 0
      ? perPoli.map((p) => ({ text: `- ${p.nama} (${p.kode}): ${p.jumlah_kunjungan} kunjungan` }))
      : [{ text: '- Belum ada data.' }]),
    { text: 'TINDAKAN TERBANYAK', bold: true, gapBefore: 10 },
    ...(tindakan.length > 0
      ? tindakan.map((t) => ({
          text: `- ${t.nama}: ${t.total_qty}x (${formatRupiah(t.total_nilai)})`,
        }))
      : [{ text: '- Belum ada data.' }]),
    { text: 'PENGGUNAAN OBAT', bold: true, gapBefore: 10 },
    ...(obat.length > 0
      ? obat.map((o) => ({
          text: `- ${o.nama}: ${o.total_jumlah} ${o.satuan} (${formatRupiah(o.total_nilai)})`,
        }))
      : [{ text: '- Belum ada data.' }]),
  ];

  return buildSimplePdf(lines);
}

/**
 * Mengunduh laporan dashboard dalam format PDF.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export function exportDashboardPdf(params: {
  from: string;
  to: string;
  summary: DashboardSummary | null;
  perPoli: KunjunganPerPoliItem[];
  tindakan: TindakanTerbanyakItem[];
  obat: ObatUsageItem[];
}): void {
  const bytes = createDashboardPdfBytes(params);
  triggerBlobDownload(
    bytes,
    'application/pdf',
    `laporan-dashboard-${params.from}_${params.to}.pdf`,
  );
}
