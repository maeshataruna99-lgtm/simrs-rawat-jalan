/**
 * Kumpulan grafik visual dashboard (kunjungan per poli, tren pendapatan harian & sumber biaya, tindakan, obat, dan metode pembayaran).
 *
 * Dipakai di: DashboardPage.tsx.
 */
import { useTranslation } from 'react-i18next';
import { AppEmptyState } from '@/components/AppEmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/format';
import type {
  KunjunganPerPoliItem,
  ObatUsageItem,
  PembayaranReport,
  PendapatanReport,
  TindakanTerbanyakItem,
} from './dashboard.types';

interface Props {
  perPoli: KunjunganPerPoliItem[];
  tindakan: TindakanTerbanyakItem[];
  pendapatan: PendapatanReport | null;
  obat: ObatUsageItem[];
  pembayaran: PembayaranReport | null;
}

/**
 * Merender grid grafik ringkasan operasional dan keuangan rawat jalan.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export function DashboardCharts({ perPoli, tindakan, pendapatan, obat, pembayaran }: Props) {
  const { t } = useTranslation();

  const maxPoli = Math.max(1, ...perPoli.map((p) => p.jumlah_kunjungan));
  const perHari = pendapatan?.per_hari ?? [];
  const maxHari = Math.max(1, ...perHari.map((d) => d.total_pendapatan));
  const perSumber = pendapatan?.per_sumber ?? [];
  const maxSumber = Math.max(1, ...perSumber.map((s) => s.total_nilai));
  const maxTindakan = Math.max(1, ...tindakan.map((item) => item.total_qty));
  const maxObat = Math.max(1, ...obat.map((item) => item.total_jumlah));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.chartPoliTitle')}</CardTitle>
          <CardDescription>{t('dashboard.chartPoliDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {perPoli.length === 0 ? (
            <AppEmptyState title={t('common.emptyData')} compact />
          ) : (
            <div className="space-y-3">
              {perPoli.map((item) => (
                <div key={item.poli_id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.nama}</span>
                    <span className="text-muted-foreground">{item.jumlah_kunjungan}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(4, Math.round((item.jumlah_kunjungan / maxPoli) * 100))}%`,
                        backgroundColor: 'hsl(var(--chart-2))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.chartPendapatanTitle')}</CardTitle>
          <CardDescription>{t('dashboard.chartPendapatanDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {perHari.length === 0 ? (
            <AppEmptyState title={t('common.emptyData')} compact />
          ) : (
            <div className="flex h-36 items-end gap-2 border-b pb-2 pt-4">
              {perHari.slice(-14).map((d) => {
                const heightPct = Math.max(8, Math.round((d.total_pendapatan / maxHari) * 100));
                return (
                  <div
                    key={d.tanggal}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={`${d.tanggal}: ${formatRupiah(d.total_pendapatan)} (${d.jumlah_transaksi}x)`}
                  >
                    <div className="flex h-24 w-full items-end justify-center">
                      <div
                        className="w-full max-w-8 rounded-t transition-all"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: 'hsl(var(--chart-1))',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.tanggal.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {perSumber.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('dashboard.komposisiSumber')}
              </p>
              {perSumber.map((s) => (
                <div key={s.sumber} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{t(`transaction.billing.sumberLabel.${s.sumber}`, s.sumber)}</span>
                    <span className="font-medium">{formatRupiah(s.total_nilai)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((s.total_nilai / maxSumber) * 100))}%`,
                        backgroundColor: 'hsl(var(--chart-4))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.chartTindakanTitle')}</CardTitle>
          <CardDescription>{t('dashboard.chartTindakanDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {tindakan.length === 0 ? (
            <AppEmptyState title={t('common.emptyData')} compact />
          ) : (
            <div className="space-y-3">
              {tindakan.slice(0, 6).map((item) => (
                <div key={item.tindakan_id} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{item.nama}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.total_qty}x · {formatRupiah(item.total_nilai)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((item.total_qty / maxTindakan) * 100))}%`,
                        backgroundColor: 'hsl(var(--chart-3))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.chartObatBayarTitle')}</CardTitle>
          <CardDescription>{t('dashboard.chartObatBayarDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {obat.length === 0 ? (
            <AppEmptyState title={t('common.emptyData')} compact />
          ) : (
            <div className="space-y-2.5">
              {obat.slice(0, 5).map((item) => (
                <div key={item.obat_id} className="space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{item.nama}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.total_jumlah} {item.satuan} · {formatRupiah(item.total_nilai)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((item.total_jumlah / maxObat) * 100))}%`,
                        backgroundColor: 'hsl(var(--chart-5))',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {pembayaran && pembayaran.per_metode.length > 0 && (
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('dashboard.metodePembayaran')}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {pembayaran.per_metode.map((m) => (
                  <div key={m.metode} className="rounded-md border bg-muted/30 p-2.5">
                    <p className="text-xs text-muted-foreground">
                      {t(`transaction.billing.metodeLabel.${m.metode}`, m.metode)} (
                      {m.jumlah_transaksi}x)
                    </p>
                    <p className="font-semibold">{formatRupiah(m.total_bayar)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
