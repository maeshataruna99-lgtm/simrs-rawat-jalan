/**
 * Halaman billing, pembayaran, dan riwayat pembayaran rawat jalan (/transaction/billing).
 * Kasir dapat menerbitkan invoice dari kunjungan, melihat rincian biaya, membayar bertahap/lunas, dan memantau riwayat pembayaran.
 *
 * Dipakai di: routes/index.tsx.
 */
import { Printer } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppDateRange } from '@/components/AppDateRange';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRupiah, hariIni } from '@/lib/format';
import { BayarDialog } from './BayarDialog';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';
import { ValidasiDialog } from './ValidasiDialog';
import * as pembayaranApi from './pembayaran.api';
import type {
  BayarResult,
  Invoice,
  InvoiceStatus,
  KunjunganBelumTagih,
  ListMeta,
  MetodePembayaran,
  PembayaranRingkas,
} from './pembayaran.types';

const MENU = 'billing';

const selectClassName =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const statusVariant: Record<InvoiceStatus, 'destructive' | 'secondary' | 'default'> = {
  belum_dibayar: 'destructive',
  dibayar_sebagian: 'secondary',
  lunas: 'default',
};

/** Rentang filter bawaan: hari ini. */
function rentangHariIni() {
  return { tanggal_dari: hariIni(), tanggal_sampai: hariIni() };
}

export default function BillingPage() {
  const { t } = useTranslation();
  const canCreate = useAuthStore((s) => s.can)(MENU, 'create');
  const canUpdate = useAuthStore((s) => s.can)(MENU, 'update');

  const [tab, setTab] = useState<'invoice' | 'belum-tagih' | 'riwayat'>('invoice');

  // State tab daftar tagihan
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [qInvoice, setQInvoice] = useState('');
  const [pageInvoice, setPageInvoice] = useState(1);
  const [perPageInvoice, setPerPageInvoice] = useState(20);
  const [rangeInvoice, setRangeInvoice] = useState(rentangHariIni);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metaInvoice, setMetaInvoice] = useState<ListMeta>({ page: 1, per_page: 20, total: 0 });
  const [loadingInvoice, setLoadingInvoice] = useState(true);

  // State tab kunjungan belum ditagih
  const [qBelum, setQBelum] = useState('');
  const [pageBelum, setPageBelum] = useState(1);
  const [perPageBelum, setPerPageBelum] = useState(20);
  const [rangeBelum, setRangeBelum] = useState(rentangHariIni);
  const [belumTagih, setBelumTagih] = useState<KunjunganBelumTagih[]>([]);
  const [metaBelum, setMetaBelum] = useState<ListMeta>({ page: 1, per_page: 20, total: 0 });
  const [loadingBelum, setLoadingBelum] = useState(false);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  // Dialog catatan kasir sebelum buat invoice (invoiceId null) atau validasi ulang invoice yang sudah ada.
  const [validasiTarget, setValidasiTarget] = useState<{
    kunjunganId: number;
    invoiceId: number | null;
  } | null>(null);
  const [validasiBusyId, setValidasiBusyId] = useState<number | null>(null);

  // State tab riwayat pembayaran
  const [metodeFilter, setMetodeFilter] = useState<MetodePembayaran | ''>('');
  const [qBayar, setQBayar] = useState('');
  const [pageBayar, setPageBayar] = useState(1);
  const [perPageBayar, setPerPageBayar] = useState(20);
  const [rangeBayar, setRangeBayar] = useState(rentangHariIni);
  const [riwayat, setRiwayat] = useState<PembayaranRingkas[]>([]);
  const [metaBayar, setMetaBayar] = useState<ListMeta>({ page: 1, per_page: 20, total: 0 });
  const [loadingBayar, setLoadingBayar] = useState(false);

  // Dialog rincian & form bayar
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const loadInvoices = useCallback(async () => {
    setLoadingInvoice(true);
    try {
      const res = await pembayaranApi.listInvoice({
        status: statusFilter,
        q: qInvoice.trim() || undefined,
        ...rangeInvoice,
        page: pageInvoice,
        per_page: perPageInvoice,
      });
      setInvoices(res.items);
      setMetaInvoice(res.meta);
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoadingInvoice(false);
    }
  }, [pageInvoice, perPageInvoice, qInvoice, rangeInvoice, statusFilter, t]);

  const loadBelumTagih = useCallback(async () => {
    setLoadingBelum(true);
    try {
      const res = await pembayaranApi.listBelumTagih({
        q: qBelum.trim() || undefined,
        ...rangeBelum,
        page: pageBelum,
        per_page: perPageBelum,
      });
      setBelumTagih(res.items);
      setMetaBelum(res.meta);
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoadingBelum(false);
    }
  }, [pageBelum, perPageBelum, qBelum, rangeBelum, t]);

  const loadRiwayat = useCallback(async () => {
    setLoadingBayar(true);
    try {
      const res = await pembayaranApi.listPembayaran({
        metode: metodeFilter,
        q: qBayar.trim() || undefined,
        ...rangeBayar,
        page: pageBayar,
        per_page: perPageBayar,
      });
      setRiwayat(res.items);
      setMetaBayar(res.meta);
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoadingBayar(false);
    }
  }, [metodeFilter, pageBayar, perPageBayar, qBayar, rangeBayar, t]);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await loadInvoices();
    })();
  }, [loadInvoices]);

  useEffect(() => {
    if (tab !== 'belum-tagih') return;
    void (async () => {
      await Promise.resolve();
      await loadBelumTagih();
    })();
  }, [tab, loadBelumTagih]);

  useEffect(() => {
    if (tab !== 'riwayat') return;
    void (async () => {
      await Promise.resolve();
      await loadRiwayat();
    })();
  }, [tab, loadRiwayat]);

  const bukaDetail = async (inv: Invoice) => {
    try {
      const fresh = await pembayaranApi.getInvoice(inv.id);
      setSelectedInvoice(fresh);
      setDetailOpen(true);
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    }
  };

  const bukaBayar = (inv: Invoice) => {
    setPayInvoice(inv);
    setIdempotencyKey(pembayaranApi.buatIdempotencyKey());
    setPayOpen(true);
  };

  const handleUbahValidasi = async (invoiceId: number, aksi: 'valid' | 'unvalid') => {
    setValidasiBusyId(invoiceId);
    try {
      const updated = await pembayaranApi.ubahValidasi(invoiceId, aksi);
      toast.success(t(`transaction.billing.validasi.${aksi}Success`));
      if (selectedInvoice?.id === invoiceId) setSelectedInvoice(updated);
      setValidasiTarget(null);
      await loadInvoices();
    } catch (err) {
      toast.error(errorMessage(err, t('common.saveFailed')));
    } finally {
      setValidasiBusyId(null);
    }
  };

  const handleBuatInvoice = async (kunjunganId: number) => {
    setValidasiTarget(null);
    setCreatingId(kunjunganId);
    try {
      const created = await pembayaranApi.buatInvoice(kunjunganId);
      toast.success(t('transaction.billing.invoiceCreated', { noInvoice: created.no_invoice }));
      setTab('invoice');
      setSelectedInvoice(created);
      setDetailOpen(true);
      await Promise.all([loadInvoices(), loadBelumTagih()]);
    } catch (err) {
      toast.error(errorMessage(err, t('common.saveFailed')));
    } finally {
      setCreatingId(null);
    }
  };

  const handleBayarSukses = async (result: BayarResult) => {
    setPayOpen(false);
    setPayInvoice(null);
    if (selectedInvoice?.id === result.invoice.id) {
      setSelectedInvoice(result.invoice);
    }
    await loadInvoices();
    if (tab === 'riwayat') {
      await loadRiwayat();
    }
  };

  const invoiceColumns: AppColumn<Invoice>[] = [
    {
      key: 'no_invoice',
      header: t('transaction.billing.colNoInvoice'),
      sortValue: (row) => row.no_invoice,
      cell: (row) => (
        <div>
          <div className="font-mono text-xs font-semibold">{row.no_invoice}</div>
          <div className="text-xs text-muted-foreground">{row.kunjungan?.tgl_kunjungan ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'pasien',
      header: t('transaction.billing.colPasien'),
      sortValue: (row) => row.pasien?.nama ?? '',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.pasien?.nama ?? '-'}</div>
          <div className="text-xs text-muted-foreground">
            {row.pasien?.no_rm ?? '-'} · {row.poli?.nama ?? '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: t('transaction.billing.totalTagihan'),
      sortValue: (row) => row.total,
      className: 'text-right',
      cell: (row) => <span className="font-medium">{formatRupiah(row.total)}</span>,
    },
    {
      key: 'total_bayar',
      header: t('transaction.billing.sudahDibayar'),
      sortValue: (row) => row.total_bayar,
      className: 'text-right',
      cell: (row) => formatRupiah(row.total_bayar),
    },
    {
      key: 'sisa',
      header: t('transaction.billing.sisaTagihan'),
      sortValue: (row) => row.sisa_tagihan,
      className: 'text-right',
      cell: (row) => <span className="font-semibold">{formatRupiah(row.sisa_tagihan)}</span>,
    },
    {
      key: 'status',
      header: t('transaction.billing.colStatus'),
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={statusVariant[row.status]}>
            {t(`transaction.billing.statusLabel.${row.status}`)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {row.kunjungan?.is_valid
              ? t('transaction.billing.validasi.lockedLabel')
              : t('transaction.billing.validasi.openLabel')}
          </span>
        </div>
      ),
    },
  ];

  const belumColumns: AppColumn<KunjunganBelumTagih>[] = [
    {
      key: 'no_kunjungan',
      header: t('transaction.billing.colNoKunjungan'),
      cell: (row) => (
        <div>
          <div className="font-mono text-xs font-semibold">{row.no_kunjungan}</div>
          <div className="text-xs text-muted-foreground">{row.tgl_kunjungan}</div>
        </div>
      ),
    },
    {
      key: 'pasien',
      header: t('transaction.billing.colPasien'),
      cell: (row) => (
        <div>
          <div className="font-medium">{row.pasien?.nama ?? '-'}</div>
          <div className="text-xs text-muted-foreground">{row.pasien?.no_rm ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'poli',
      header: t('transaction.billing.colPoliDokter'),
      cell: (row) => (
        <div>
          <div>{row.poli?.nama ?? '-'}</div>
          <div className="text-xs text-muted-foreground">{row.dokter?.nama ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('transaction.billing.colStatus'),
      cell: (row) => <Badge variant="outline">{row.status}</Badge>,
    },
  ];

  const riwayatColumns: AppColumn<PembayaranRingkas>[] = [
    {
      key: 'no_pembayaran',
      header: t('transaction.billing.colNoPembayaran'),
      cell: (row) => (
        <div>
          <div className="font-mono text-xs font-semibold">{row.no_pembayaran}</div>
          <div className="text-xs text-muted-foreground">{row.dibayar_at}</div>
        </div>
      ),
    },
    {
      key: 'invoice',
      header: t('transaction.billing.colNoInvoice'),
      cell: (row) => (
        <div>
          <div className="font-mono text-xs">{row.invoice?.no_invoice ?? '-'}</div>
          <div className="text-xs text-muted-foreground">
            {row.invoice?.pasien ? `${row.invoice.pasien.no_rm} — ${row.invoice.pasien.nama}` : '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'metode',
      header: t('transaction.billing.metode'),
      cell: (row) => (
        <Badge variant="outline">{t(`transaction.billing.metodeLabel.${row.metode}`)}</Badge>
      ),
    },
    {
      key: 'no_referensi',
      header: t('transaction.billing.noReferensi'),
      cell: (row) => row.no_referensi ?? '-',
    },
    {
      key: 'kasir',
      header: t('transaction.billing.colKasir'),
      cell: (row) => row.kasir?.nama ?? '-',
    },
    {
      key: 'jumlah',
      header: t('transaction.billing.jumlahBayar'),
      className: 'text-right',
      cell: (row) => <span className="font-semibold">{formatRupiah(row.jumlah)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('transaction.billing.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('transaction.billing.subtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="invoice">{t('transaction.billing.tabInvoice')}</TabsTrigger>
          <TabsTrigger value="belum-tagih">{t('transaction.billing.tabBelumTagih')}</TabsTrigger>
          <TabsTrigger value="riwayat">{t('transaction.billing.tabRiwayat')}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={qInvoice}
              onChange={(e) => {
                setQInvoice(e.target.value);
                setPageInvoice(1);
              }}
              placeholder={t('transaction.billing.searchInvoicePlaceholder')}
              className="max-w-xs"
            />
            <select
              aria-label={t('transaction.billing.colStatus')}
              className={selectClassName}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as InvoiceStatus | '');
                setPageInvoice(1);
              }}
            >
              <option value="">{t('common.all')}</option>
              <option value="belum_dibayar">
                {t('transaction.billing.statusLabel.belum_dibayar')}
              </option>
              <option value="dibayar_sebagian">
                {t('transaction.billing.statusLabel.dibayar_sebagian')}
              </option>
              <option value="lunas">{t('transaction.billing.statusLabel.lunas')}</option>
            </select>
            <AppDateRange
              dari={rangeInvoice.tanggal_dari}
              sampai={rangeInvoice.tanggal_sampai}
              onChange={(range) => {
                setRangeInvoice(range);
                setPageInvoice(1);
              }}
            />
          </div>

          <AppDataTable
            columns={invoiceColumns}
            rows={invoices}
            rowKey={(row) => row.id}
            loading={loadingInvoice}
            emptyText={t('transaction.billing.emptyInvoice')}
            extraActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <Button variant="outline" size="sm" onClick={() => void bukaDetail(row)}>
                  {t('common.detail')}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/transaction/billing/invoice/${row.id}/cetak`}>
                    <Printer className="mr-1 size-3.5" />
                    {t('transaction.billing.print.printButton')}
                  </Link>
                </Button>
                {canUpdate && row.status !== 'lunas' && row.kunjungan && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={validasiBusyId === row.id}
                    onClick={() =>
                      row.kunjungan?.is_valid
                        ? void handleUbahValidasi(row.id, 'unvalid')
                        : setValidasiTarget({ kunjunganId: row.kunjungan_id, invoiceId: row.id })
                    }
                  >
                    {row.kunjungan.is_valid
                      ? t('transaction.billing.validasi.unvalidAction')
                      : t('transaction.billing.validasi.validAction')}
                  </Button>
                )}
                {canCreate && row.status !== 'lunas' && (
                  <Button size="sm" onClick={() => bukaBayar(row)}>
                    {t('transaction.billing.payAction')}
                  </Button>
                )}
              </div>
            )}
          />
          <AppPaginator
            page={metaInvoice.page}
            perPage={metaInvoice.per_page}
            total={metaInvoice.total}
            onPageChange={setPageInvoice}
            onPerPageChange={(n) => {
              setPerPageInvoice(n);
              setPageInvoice(1);
            }}
          />
        </TabsContent>

        <TabsContent value="belum-tagih" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={qBelum}
              onChange={(e) => {
                setQBelum(e.target.value);
                setPageBelum(1);
              }}
              placeholder={t('transaction.billing.searchBelumPlaceholder')}
              className="max-w-xs"
            />
            <AppDateRange
              dari={rangeBelum.tanggal_dari}
              sampai={rangeBelum.tanggal_sampai}
              onChange={(range) => {
                setRangeBelum(range);
                setPageBelum(1);
              }}
            />
          </div>

          <AppDataTable
            columns={belumColumns}
            rows={belumTagih}
            rowKey={(row) => row.id}
            loading={loadingBelum}
            emptyText={t('transaction.billing.emptyBelumTagih')}
            extraActions={
              canCreate
                ? (row) => (
                    <Button
                      size="sm"
                      disabled={creatingId === row.id}
                      onClick={() => setValidasiTarget({ kunjunganId: row.id, invoiceId: null })}
                    >
                      {creatingId === row.id
                        ? t('common.saving')
                        : t('transaction.billing.createInvoiceAction')}
                    </Button>
                  )
                : undefined
            }
          />
          <AppPaginator
            page={metaBelum.page}
            perPage={metaBelum.per_page}
            total={metaBelum.total}
            onPageChange={setPageBelum}
            onPerPageChange={(n) => {
              setPerPageBelum(n);
              setPageBelum(1);
            }}
          />
        </TabsContent>

        <TabsContent value="riwayat" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={qBayar}
              onChange={(e) => {
                setQBayar(e.target.value);
                setPageBayar(1);
              }}
              placeholder={t('transaction.billing.searchBayarPlaceholder')}
              className="max-w-xs"
            />
            <select
              aria-label={t('transaction.billing.metode')}
              className={selectClassName}
              value={metodeFilter}
              onChange={(e) => {
                setMetodeFilter(e.target.value as MetodePembayaran | '');
                setPageBayar(1);
              }}
            >
              <option value="">{t('common.all')}</option>
              <option value="tunai">{t('transaction.billing.metodeLabel.tunai')}</option>
              <option value="non_tunai">{t('transaction.billing.metodeLabel.non_tunai')}</option>
            </select>
            <AppDateRange
              dari={rangeBayar.tanggal_dari}
              sampai={rangeBayar.tanggal_sampai}
              onChange={(range) => {
                setRangeBayar(range);
                setPageBayar(1);
              }}
            />
          </div>

          <AppDataTable
            columns={riwayatColumns}
            rows={riwayat}
            rowKey={(row) => row.id}
            loading={loadingBayar}
            emptyText={t('transaction.billing.emptyRiwayat')}
            extraActions={(row) => (
              <Button asChild variant="outline" size="sm">
                <Link to={`/transaction/billing/pembayaran/${row.id}/cetak`}>
                  <Printer className="mr-1 size-3.5" />
                  {t('transaction.billing.print.printReceipt')}
                </Link>
              </Button>
            )}
          />
          <AppPaginator
            page={metaBayar.page}
            perPage={metaBayar.per_page}
            total={metaBayar.total}
            onPageChange={setPageBayar}
            onPerPageChange={(n) => {
              setPerPageBayar(n);
              setPageBayar(1);
            }}
          />
        </TabsContent>
      </Tabs>

      <ValidasiDialog
        kunjunganId={validasiTarget?.kunjunganId ?? null}
        title={
          validasiTarget?.invoiceId
            ? t('transaction.billing.validasi.validTitle')
            : t('transaction.billing.validasi.createTitle')
        }
        confirmLabel={
          validasiTarget?.invoiceId
            ? t('transaction.billing.validasi.validAction')
            : t('transaction.billing.createInvoiceAction')
        }
        loading={creatingId !== null || validasiBusyId !== null}
        onOpenChange={(open) => !open && setValidasiTarget(null)}
        onConfirm={async () => {
          if (!validasiTarget) return;
          if (validasiTarget.invoiceId) await handleUbahValidasi(validasiTarget.invoiceId, 'valid');
          else await handleBuatInvoice(validasiTarget.kunjunganId);
        }}
      />

      <InvoiceDetailDialog
        open={detailOpen}
        invoice={selectedInvoice}
        canPay={canCreate}
        onOpenChange={setDetailOpen}
        onPay={(inv) => {
          setDetailOpen(false);
          bukaBayar(inv);
        }}
      />

      <BayarDialog
        open={payOpen}
        invoice={payInvoice}
        idempotencyKey={idempotencyKey}
        onOpenChange={setPayOpen}
        onSuccess={(result) => void handleBayarSukses(result)}
      />
    </div>
  );
}
