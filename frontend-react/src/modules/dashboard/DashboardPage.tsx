/**
 * Halaman dashboard dan laporan rawat jalan (/dashboard).
 * Menampilkan kartu ringkasan, grafik operasional & keuangan, filter periode, serta tabel rincian berhalaman dari service Node.
 *
 * Dipakai di: routes/index.tsx.
 */
import { Activity, CreditCard, FileDown, FileSpreadsheet, Stethoscope, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorMessage } from '@/lib/api-client';
import { exportDashboardExcel } from '@/lib/export-excel';
import { exportDashboardPdf } from '@/lib/export-pdf';
import { formatRupiah } from '@/lib/format';
import { DashboardCharts } from './DashboardCharts';
import * as dashboardApi from './dashboard.api';
import type {
  DashboardDetailRow,
  DashboardMeta,
  DashboardSummary,
  DetailJenis,
  KunjunganPerPoliItem,
  ObatUsageItem,
  PembayaranReport,
  PendapatanReport,
  PeriodeFilter,
  TindakanTerbanyakItem,
} from './dashboard.types';

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultRange(): PeriodeFilter {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return { from: formatIsoDate(start), to: formatIsoDate(today) };
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const initial = defaultRange();

  const [fromInput, setFromInput] = useState(initial.from);
  const [toInput, setToInput] = useState(initial.to);
  const [periode, setPeriode] = useState<PeriodeFilter>(initial);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [perPoli, setPerPoli] = useState<KunjunganPerPoliItem[]>([]);
  const [tindakan, setTindakan] = useState<TindakanTerbanyakItem[]>([]);
  const [pendapatan, setPendapatan] = useState<PendapatanReport | null>(null);
  const [obat, setObat] = useState<ObatUsageItem[]>([]);
  const [pembayaran, setPembayaran] = useState<PembayaranReport | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [jenis, setJenis] = useState<DetailJenis>('kunjungan');
  const [page, setPage] = useState(1);
  const [detailRows, setDetailRows] = useState<DashboardDetailRow[]>([]);
  const [detailMeta, setDetailMeta] = useState<DashboardMeta>({ page: 1, per_page: 10, total: 0 });
  const [loadingDetail, setLoadingDetail] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [s, p, tn, pd, ob, pb] = await Promise.all([
        dashboardApi.getSummary(periode),
        dashboardApi.getKunjunganPerPoli(periode),
        dashboardApi.getTindakan(periode),
        dashboardApi.getPendapatan(periode),
        dashboardApi.getObat(periode),
        dashboardApi.getPembayaran(periode),
      ]);
      setSummary(s);
      setPerPoli(p);
      setTindakan(tn);
      setPendapatan(pd);
      setObat(ob);
      setPembayaran(pb);
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoadingStats(false);
    }
  }, [periode, t]);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const res = await dashboardApi.getDetail(jenis, { ...periode, page, per_page: 10 });
      setDetailRows(res.items);
      setDetailMeta(res.meta);
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoadingDetail(false);
    }
  }, [jenis, page, periode, t]);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await loadStats();
    })();
  }, [loadStats]);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await loadDetail();
    })();
  }, [loadDetail]);

  const handleApplyPeriode = (e: FormEvent) => {
    e.preventDefault();
    if (!fromInput || !toInput || fromInput > toInput) {
      toast.error(t('dashboard.invalidPeriode'));
      return;
    }
    setPage(1);
    setPeriode({ from: fromInput, to: toInput });
  };

  const applyPreset = (days: number | 'month') => {
    const today = new Date();
    const to = formatIsoDate(today);
    let from: string;
    if (days === 'month') {
      from = formatIsoDate(new Date(today.getFullYear(), today.getMonth(), 1));
    } else {
      const start = new Date(today);
      start.setDate(start.getDate() - (days - 1));
      from = formatIsoDate(start);
    }
    setFromInput(from);
    setToInput(to);
    setPage(1);
    setPeriode({ from, to });
  };

  const detailColumns: Record<DetailJenis, AppColumn<DashboardDetailRow>[]> = {
    kunjungan: [
      {
        key: 'tgl',
        header: t('dashboard.colTanggal'),
        cell: (r) => String(r.tgl_kunjungan ?? '-'),
      },
      {
        key: 'no',
        header: t('transaction.billing.colNoKunjungan'),
        cell: (r) => <span className="font-mono text-xs">{String(r.no_kunjungan ?? '-')}</span>,
      },
      {
        key: 'pasien',
        header: t('transaction.billing.colPasien'),
        cell: (r) => `${String(r.no_rm ?? '-')} — ${String(r.pasien ?? '-')}`,
      },
      { key: 'poli', header: t('dashboard.colPoli'), cell: (r) => String(r.poli ?? '-') },
      { key: 'dokter', header: t('dashboard.colDokter'), cell: (r) => String(r.dokter ?? '-') },
      {
        key: 'status',
        header: t('transaction.billing.colStatus'),
        cell: (r) => <Badge variant="outline">{String(r.status ?? '-')}</Badge>,
      },
    ],
    tindakan: [
      {
        key: 'tgl',
        header: t('dashboard.colTanggal'),
        cell: (r) => String(r.tgl_kunjungan ?? '-'),
      },
      {
        key: 'pasien',
        header: t('transaction.billing.colPasien'),
        cell: (r) => String(r.pasien ?? '-'),
      },
      {
        key: 'tindakan',
        header: t('dashboard.colTindakan'),
        cell: (r) => String(r.tindakan ?? '-'),
      },
      {
        key: 'qty',
        header: t('transaction.billing.colQty'),
        className: 'text-right',
        cell: (r) => String(r.qty ?? 0),
      },
      {
        key: 'subtotal',
        header: t('transaction.billing.colSubtotal'),
        className: 'text-right',
        cell: (r) => formatRupiah(Number(r.subtotal ?? 0)),
      },
    ],
    pendapatan: [
      {
        key: 'waktu',
        header: t('transaction.billing.print.waktuBayar'),
        cell: (r) => String(r.dibayar_at ?? '-'),
      },
      {
        key: 'no',
        header: t('transaction.billing.colNoPembayaran'),
        cell: (r) => <span className="font-mono text-xs">{String(r.no_pembayaran ?? '-')}</span>,
      },
      {
        key: 'pasien',
        header: t('transaction.billing.colPasien'),
        cell: (r) => String(r.pasien ?? '-'),
      },
      {
        key: 'metode',
        header: t('transaction.billing.metode'),
        cell: (r) => (
          <Badge variant="outline">
            {t(`transaction.billing.metodeLabel.${String(r.metode ?? 'tunai')}`)}
          </Badge>
        ),
      },
      {
        key: 'jumlah',
        header: t('transaction.billing.jumlahBayar'),
        className: 'text-right',
        cell: (r) => <span className="font-medium">{formatRupiah(Number(r.jumlah ?? 0))}</span>,
      },
    ],
    obat: [
      {
        key: 'tgl',
        header: t('dashboard.colTanggal'),
        cell: (r) => String(r.tgl_kunjungan ?? '-'),
      },
      {
        key: 'resep',
        header: t('dashboard.colNoResep'),
        cell: (r) => <span className="font-mono text-xs">{String(r.no_resep ?? '-')}</span>,
      },
      { key: 'obat', header: t('dashboard.colObat'), cell: (r) => String(r.obat ?? '-') },
      {
        key: 'jumlah',
        header: t('dashboard.colJumlah'),
        className: 'text-right',
        cell: (r) => `${String(r.jumlah ?? 0)} ${String(r.satuan ?? '')}`,
      },
      {
        key: 'subtotal',
        header: t('transaction.billing.colSubtotal'),
        className: 'text-right',
        cell: (r) => formatRupiah(Number(r.subtotal ?? 0)),
      },
    ],
    pembayaran: [
      {
        key: 'tgl',
        header: t('dashboard.colTanggal'),
        cell: (r) => String(r.tgl_kunjungan ?? '-'),
      },
      {
        key: 'inv',
        header: t('transaction.billing.colNoInvoice'),
        cell: (r) => <span className="font-mono text-xs">{String(r.no_invoice ?? '-')}</span>,
      },
      {
        key: 'pasien',
        header: t('transaction.billing.colPasien'),
        cell: (r) => String(r.pasien ?? '-'),
      },
      {
        key: 'total',
        header: t('transaction.billing.totalTagihan'),
        className: 'text-right',
        cell: (r) => formatRupiah(Number(r.total ?? 0)),
      },
      {
        key: 'bayar',
        header: t('transaction.billing.sudahDibayar'),
        className: 'text-right',
        cell: (r) => formatRupiah(Number(r.total_bayar ?? 0)),
      },
      {
        key: 'status',
        header: t('transaction.billing.colStatus'),
        cell: (r) => (
          <Badge variant="outline">
            {t(`transaction.billing.statusLabel.${String(r.status ?? 'belum_dibayar')}`)}
          </Badge>
        ),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>

        <form onSubmit={handleApplyPeriode} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="dash-from" className="text-xs">
              {t('dashboard.fromDate')}
            </Label>
            <Input
              id="dash-from"
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dash-to" className="text-xs">
              {t('dashboard.toDate')}
            </Label>
            <Input
              id="dash-to"
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="w-40"
            />
          </div>
          <Button type="submit">{t('dashboard.applyFilter')}</Button>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(1)}>
              {t('dashboard.presetToday')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(7)}>
              {t('dashboard.preset7d')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(30)}>
              {t('dashboard.preset30d')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('month')}>
              {t('dashboard.presetMonth')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportDashboardPdf({
                  from: periode.from,
                  to: periode.to,
                  summary,
                  perPoli,
                  tindakan,
                  obat,
                })
              }
            >
              <FileDown className="mr-1 size-3.5" />
              {t('common.exportPdf')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportDashboardExcel({
                  from: periode.from,
                  to: periode.to,
                  summary,
                  perPoli,
                  tindakan,
                  pendapatan,
                  obat,
                  pembayaran,
                })
              }
            >
              <FileSpreadsheet className="mr-1 size-3.5" />
              {t('common.exportExcel')}
            </Button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.cardKunjungan')}</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-kunjungan">
              {loadingStats ? '...' : (summary?.total_kunjungan ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {periode.from} s/d {periode.to}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.cardTindakan')}</CardTitle>
            <Stethoscope className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-tindakan">
              {loadingStats ? '...' : (summary?.total_tindakan ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">{t('dashboard.cardTindakanHint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.cardPendapatan')}</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-pendapatan">
              {loadingStats ? '...' : formatRupiah(summary?.total_pendapatan ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.totalTagihanLabel', {
                total: formatRupiah(summary?.total_tagihan ?? 0),
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.cardInvoice')}</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-lunas">
              {loadingStats ? '...' : (summary?.invoice_per_status.lunas ?? 0)}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {t('transaction.billing.statusLabel.lunas')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.invoiceBreakdown', {
                sebagian: summary?.invoice_per_status.dibayar_sebagian ?? 0,
                belum: summary?.invoice_per_status.belum_dibayar ?? 0,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts
        perPoli={perPoli}
        tindakan={tindakan}
        pendapatan={pendapatan}
        obat={obat}
        pembayaran={pembayaran}
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">{t('dashboard.detailTitle')}</CardTitle>
          </div>
          <Tabs
            value={jenis}
            onValueChange={(v) => {
              setJenis(v as DetailJenis);
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="kunjungan">{t('dashboard.tabKunjungan')}</TabsTrigger>
              <TabsTrigger value="tindakan">{t('dashboard.tabTindakan')}</TabsTrigger>
              <TabsTrigger value="pendapatan">{t('dashboard.tabPendapatan')}</TabsTrigger>
              <TabsTrigger value="obat">{t('dashboard.tabObat')}</TabsTrigger>
              <TabsTrigger value="pembayaran">{t('dashboard.tabPembayaran')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-4">
          <AppDataTable
            columns={detailColumns[jenis]}
            rows={detailRows}
            rowKey={(r) => `${jenis}-${r.id}`}
            loading={loadingDetail}
            emptyText={t('common.emptyData')}
          />
          <AppPaginator
            page={detailMeta.page}
            perPage={detailMeta.per_page}
            total={detailMeta.total}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
