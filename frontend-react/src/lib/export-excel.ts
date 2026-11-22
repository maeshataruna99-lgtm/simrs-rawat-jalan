/**
 * Pembuat file Excel SpreadsheetML (.xls) multi-sheet untuk export laporan dashboard tanpa dependensi eksternal.
 *
 * Dipakai di: DashboardPage.tsx, tests/export-excel.test.ts.
 */
import { triggerBlobDownload } from '@/lib/export-pdf';
import type {
  DashboardSummary,
  KunjunganPerPoliItem,
  ObatUsageItem,
  PembayaranReport,
  PendapatanReport,
  TindakanTerbanyakItem,
} from '@/modules/dashboard/dashboard.types';

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
}

function escapeXml(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderCell(value: string | number | null | undefined, styleId?: string): string {
  const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell${styleAttr}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${styleAttr}><Data ss:Type="String">${escapeXml(String(value ?? ''))}</Data></Cell>`;
}

/**
 * Merakit string XML SpreadsheetML 2003 multi-sheet yang dapat dibuka langsung oleh Microsoft Excel dan LibreOffice Calc.
 *
 * Dipakai di: createDashboardExcelXml(), tests/export-excel.test.ts.
 */
export function buildSpreadsheetXml(sheets: ExcelSheet[]): string {
  const sheetXml = sheets
    .map((sheet) => {
      const safeName = escapeXml(sheet.name.slice(0, 31));
      const headerRow = `<Row>${sheet.headers.map((h) => renderCell(h, 'Header')).join('')}</Row>`;
      const dataRows = sheet.rows
        .map((row) => `<Row>${row.map((cell) => renderCell(cell)).join('')}</Row>`)
        .join('');
      return `<Worksheet ss:Name="${safeName}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/></Style></Styles>' +
    sheetXml +
    '</Workbook>'
  );
}

/**
 * Membuat konten XML Excel multi-sheet untuk laporan dashboard sesuai periode.
 *
 * Dipakai di: exportDashboardExcel(), tests/export-excel.test.ts.
 */
export function createDashboardExcelXml(params: {
  from: string;
  to: string;
  summary: DashboardSummary | null;
  perPoli: KunjunganPerPoliItem[];
  tindakan: TindakanTerbanyakItem[];
  pendapatan: PendapatanReport | null;
  obat: ObatUsageItem[];
  pembayaran: PembayaranReport | null;
}): string {
  const { from, to, summary, perPoli, tindakan, pendapatan, obat, pembayaran } = params;

  const sheets: ExcelSheet[] = [
    {
      name: 'Ringkasan',
      headers: ['Indikator', 'Nilai'],
      rows: [
        ['Periode', `${from} s/d ${to}`],
        ['Total Kunjungan', summary?.total_kunjungan ?? 0],
        ['Total Tindakan', summary?.total_tindakan ?? 0],
        ...(summary?.invoice_per_status
          ? [
              ['Pendapatan Diterima', summary.total_pendapatan ?? 0],
              ['Total Tagihan', summary.total_tagihan ?? 0],
              ['Invoice Lunas', summary.invoice_per_status.lunas],
              ['Invoice Dibayar Sebagian', summary.invoice_per_status.dibayar_sebagian],
              ['Invoice Belum Dibayar', summary.invoice_per_status.belum_dibayar],
            ]
          : []),
      ],
    },
    {
      name: 'Kunjungan per Poli',
      headers: ['Kode Poli', 'Nama Poli', 'Jumlah Kunjungan'],
      rows: perPoli.map((p) => [p.kode, p.nama, p.jumlah_kunjungan]),
    },
    {
      name: 'Tindakan Terbanyak',
      headers: ['Kode', 'Nama Tindakan', 'Frekuensi', 'Total Qty', 'Total Nilai'],
      rows: tindakan.map((t) => [t.kode, t.nama, t.jumlah_kali, t.total_qty, t.total_nilai]),
    },
    {
      name: 'Pendapatan Harian',
      headers: ['Tanggal', 'Jumlah Transaksi', 'Total Pendapatan'],
      rows: (pendapatan?.per_hari ?? []).map((d) => [
        d.tanggal,
        d.jumlah_transaksi,
        d.total_pendapatan,
      ]),
    },
    {
      name: 'Penggunaan Obat',
      headers: ['Kode', 'Nama Obat', 'Satuan', 'Total Jumlah', 'Total Nilai'],
      rows: obat.map((o) => [o.kode, o.nama, o.satuan, o.total_jumlah, o.total_nilai]),
    },
    {
      name: 'Pembayaran',
      headers: ['Metode', 'Jumlah Transaksi', 'Total Bayar'],
      rows: (pembayaran?.per_metode ?? []).map((m) => [
        m.metode,
        m.jumlah_transaksi,
        m.total_bayar,
      ]),
    },
  ];

  // Sheet pendapatan dan pembayaran dibuang untuk role tanpa izin keuangan (datanya null).
  return buildSpreadsheetXml(
    sheets.filter(
      (s) =>
        !(
          (s.name === 'Pendapatan Harian' && !pendapatan) ||
          (s.name === 'Pembayaran' && !pembayaran)
        ),
    ),
  );
}

/**
 * Mengunduh laporan dashboard dalam format Excel (.xls).
 *
 * Dipakai di: DashboardPage.tsx.
 */
export function exportDashboardExcel(params: {
  from: string;
  to: string;
  summary: DashboardSummary | null;
  perPoli: KunjunganPerPoliItem[];
  tindakan: TindakanTerbanyakItem[];
  pendapatan: PendapatanReport | null;
  obat: ObatUsageItem[];
  pembayaran: PembayaranReport | null;
}): void {
  const xml = createDashboardExcelXml(params);
  triggerBlobDownload(
    xml,
    'application/vnd.ms-excel;charset=utf-8',
    `laporan-dashboard-${params.from}_${params.to}.xls`,
  );
}
