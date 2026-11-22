/**
 * Kumpulan grafik dashboard berbasis Recharts: tren penerimaan harian, kunjungan per poli,
 * komposisi tagihan per sumber biaya, tindakan terbanyak, dan obat terbanyak.
 * Hari tanpa transaksi diisi 0 agar sumbu waktu mencerminkan seluruh periode filter.
 *
 * Dipakai di: DashboardPage.tsx.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppEmptyState } from '@/components/AppEmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/format';
import type {
  KunjunganPerPoliItem,
  ObatUsageItem,
  PembayaranReport,
  PendapatanReport,
  PeriodeFilter,
  TindakanTerbanyakItem,
} from './dashboard.types';

interface Props {
  periode: PeriodeFilter;
  perPoli: KunjunganPerPoliItem[];
  tindakan: TindakanTerbanyakItem[];
  pendapatan: PendapatanReport | null;
  obat: ObatUsageItem[];
  pembayaran: PembayaranReport | null;
}

interface DailyPoint {
  tanggal: string;
  total: number;
  transaksi: number;
}

interface BarPoint {
  key: string | number;
  name: string;
  value: number;
  label: string;
}

const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const GRID_STROKE = 'hsl(var(--border))';
const TOOLTIP_CLASS =
  'rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md';

/** Warna tetap per sumber biaya agar warna mengikuti entitas, bukan urutan nilainya. */
const SUMBER_COLORS: Record<string, string> = {
  pendaftaran: 'hsl(var(--chart-1))',
  tindakan: 'hsl(var(--chart-2))',
  lab: 'hsl(var(--chart-3))',
  obat: 'hsl(var(--chart-4))',
};

function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Melengkapi data pendapatan harian dengan nilai 0 untuk setiap hari tanpa pembayaran
 * dari tanggal awal sampai akhir periode.
 */
function fillDailySeries(
  periode: PeriodeFilter,
  perHari: PendapatanReport['per_hari'],
): DailyPoint[] {
  const byDate = new Map(perHari.map((d) => [d.tanggal, d]));
  const result: DailyPoint[] = [];
  const end = parseIsoDate(periode.to);
  for (let cur = parseIsoDate(periode.from); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const key = toIsoDate(cur);
    const row = byDate.get(key);
    result.push({
      tanggal: key,
      total: row?.total_pendapatan ?? 0,
      transaksi: row?.jumlah_transaksi ?? 0,
    });
  }
  return result;
}

function useLocaleFormatters() {
  const { i18n } = useTranslation();
  const intlLocale = i18n.language.startsWith('en') ? 'en-US' : 'id-ID';
  const compact = new Intl.NumberFormat(intlLocale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return {
    compactRupiah: (value: number) => `Rp ${compact.format(value)}`,
    shortDate: (iso: string) =>
      parseIsoDate(iso).toLocaleDateString(intlLocale, { day: 'numeric', month: 'short' }),
    longDate: (iso: string) =>
      parseIsoDate(iso).toLocaleDateString(intlLocale, {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
  };
}

/** Memotong nama agar tidak menabrak label nilai di sisi kanan (perkiraan lebar karakter ~6.5px). */
function fitName(name: string, availablePx: number): string {
  const maxChars = Math.max(6, Math.floor(availablePx / 6.5));
  return name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
}

/**
 * Grafik batang horizontal untuk data peringkat. Tiap baris: nama di kiri atas, nilai di kanan atas,
 * dan batang selebar penuh di bawahnya dengan lintasan abu-abu sebagai skala 100%.
 * Tata letak ini tetap terbaca dari layar ponsel sampai desktop.
 */
function RankedBarChart({ data, color }: { data: BarPoint[]; color: string }) {
  const [chartWidth, setChartWidth] = useState(0);
  const height = data.length * 46;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" onResize={(w) => setChartWidth(w)}>
        <BarChart data={data} layout="vertical" margin={{ top: 18, right: 0, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, (max: number) => Math.max(1, max)]} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as BarPoint | undefined) : undefined;
              if (!p) return null;
              return (
                <div className={TOOLTIP_CLASS}>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-muted-foreground">{p.label}</p>
                </div>
              );
            }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={4}
            barSize={10}
            background={{ fill: 'hsl(var(--muted))', radius: 4 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="name"
              content={({ x, y, index }) => {
                const row = data[Number(index)];
                if (!row) return null;
                const labelPx = row.label.length * 6 + 16;
                return (
                  <g>
                    <text
                      x={Number(x)}
                      y={Number(y) - 7}
                      fontSize={12}
                      fill="hsl(var(--foreground))"
                    >
                      {fitName(row.name, chartWidth - labelPx)}
                    </text>
                    <text
                      x={chartWidth}
                      y={Number(y) - 7}
                      fontSize={11}
                      textAnchor="end"
                      fill="hsl(var(--muted-foreground))"
                    >
                      {row.label}
                    </text>
                  </g>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Merender seluruh grafik ringkasan operasional dan keuangan rawat jalan.
 *
 * Dipakai di: DashboardPage.tsx.
 */
export function DashboardCharts({
  periode,
  perPoli,
  tindakan,
  pendapatan,
  obat,
  pembayaran,
}: Props) {
  const { t } = useTranslation();
  const fmt = useLocaleFormatters();

  const daily = fillDailySeries(periode, pendapatan?.per_hari ?? []);
  const totalPenerimaan = daily.reduce((sum, d) => sum + d.total, 0);
  const totalTransaksi = daily.reduce((sum, d) => sum + d.transaksi, 0);
  const hasDaily = totalTransaksi > 0;

  const perSumber = (pendapatan?.per_sumber ?? []).filter((s) => s.total_nilai > 0);
  const totalSumber = perSumber.reduce((sum, s) => sum + s.total_nilai, 0);

  const poliData: BarPoint[] = [...perPoli]
    .sort((a, b) => b.jumlah_kunjungan - a.jumlah_kunjungan)
    .map((p) => ({
      key: p.poli_id,
      name: p.nama,
      value: p.jumlah_kunjungan,
      label: t('dashboard.kunjunganCount', { n: p.jumlah_kunjungan }),
    }));

  const tindakanData: BarPoint[] = [...tindakan]
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, 6)
    .map((item) => ({
      key: item.tindakan_id,
      name: item.nama,
      value: item.total_qty,
      label: `${item.total_qty}x · ${formatRupiah(item.total_nilai)}`,
    }));

  // Satuan obat berbeda-beda (tablet, botol, tube), sehingga peringkat memakai nilai rupiah agar sebanding.
  const obatData: BarPoint[] = [...obat]
    .sort((a, b) => b.total_nilai - a.total_nilai)
    .slice(0, 6)
    .map((item) => ({
      key: item.obat_id,
      name: item.nama,
      value: item.total_nilai,
      label: `${item.total_jumlah} ${item.satuan} · ${formatRupiah(item.total_nilai)}`,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {pendapatan && (
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-base">{t('dashboard.chartPendapatanTitle')}</CardTitle>
              <CardDescription>{t('dashboard.chartPendapatanDesc')}</CardDescription>
            </div>
            <div className="sm:text-right">
              <p className="text-xl font-semibold tabular-nums">{formatRupiah(totalPenerimaan)}</p>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.transaksiCount', { n: totalTransaksi })}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasDaily ? (
              <AppEmptyState title={t('common.emptyData')} compact />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="fill-penerimaan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tanggal"
                      tickFormatter={fmt.shortDate}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: GRID_STROKE }}
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={fmt.compactRupiah}
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      width={72}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        const p = active
                          ? (payload?.[0]?.payload as DailyPoint | undefined)
                          : undefined;
                        if (!p) return null;
                        return (
                          <div className={TOOLTIP_CLASS}>
                            <p className="font-medium">{fmt.longDate(p.tanggal)}</p>
                            <p className="tabular-nums">{formatRupiah(p.total)}</p>
                            <p className="text-muted-foreground">
                              {t('dashboard.transaksiCount', { n: p.transaksi })}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fill="url(#fill-penerimaan)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {pembayaran && pembayaran.per_metode.length > 0 && (
              <div className="border-t pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t('dashboard.metodePembayaran')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  {pembayaran.per_metode.map((m) => (
                    <div key={m.metode} className="rounded-md border bg-muted/30 p-2.5">
                      <p className="text-xs text-muted-foreground">
                        {t(`transaction.billing.metodeLabel.${m.metode}`, m.metode)} (
                        {m.jumlah_transaksi}x)
                      </p>
                      <p className="font-semibold tabular-nums">{formatRupiah(m.total_bayar)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.chartPoliTitle')}</CardTitle>
          <CardDescription>{t('dashboard.chartPoliDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {poliData.length === 0 ? (
            <AppEmptyState title={t('common.emptyData')} compact />
          ) : (
            <RankedBarChart data={poliData} color="hsl(var(--chart-1))" />
          )}
        </CardContent>
      </Card>

      {pendapatan && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.komposisiSumber')}</CardTitle>
            <CardDescription>{t('dashboard.komposisiSumberDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {perSumber.length === 0 ? (
              <AppEmptyState title={t('common.emptyData')} compact />
            ) : (
              <div className="flex flex-col items-center gap-4 xl:flex-row">
                <div className="relative size-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={perSumber}
                        dataKey="total_nilai"
                        nameKey="sumber"
                        innerRadius="62%"
                        outerRadius="100%"
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {perSumber.map((s) => (
                          <Cell
                            key={s.sumber}
                            fill={SUMBER_COLORS[s.sumber] ?? 'hsl(var(--muted-foreground))'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          const p = active
                            ? (payload?.[0]?.payload as
                                { sumber: string; total_nilai: number } | undefined)
                            : undefined;
                          if (!p) return null;
                          return (
                            <div className={TOOLTIP_CLASS}>
                              <p className="font-medium">
                                {t(`transaction.billing.sumberLabel.${p.sumber}`, p.sumber)}
                              </p>
                              <p className="tabular-nums">{formatRupiah(p.total_nilai)}</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t('dashboard.totalLabel')}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {fmt.compactRupiah(totalSumber)}
                    </span>
                  </div>
                </div>
                <ul className="w-full space-y-2">
                  {perSumber.map((s) => (
                    <li key={s.sumber} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{
                          backgroundColor:
                            SUMBER_COLORS[s.sumber] ?? 'hsl(var(--muted-foreground))',
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {t(`transaction.billing.sumberLabel.${s.sumber}`, s.sumber)}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {((s.total_nilai / totalSumber) * 100).toFixed(1)}%
                      </span>
                      <span className="shrink-0 text-right font-medium tabular-nums">
                        {formatRupiah(s.total_nilai)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.chartTindakanTitle')}</CardTitle>
          <CardDescription>{t('dashboard.chartTindakanDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {tindakanData.length === 0 ? (
            <AppEmptyState title={t('common.emptyData')} compact />
          ) : (
            <RankedBarChart data={tindakanData} color="hsl(var(--chart-1))" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.chartObatBayarTitle')}</CardTitle>
          <CardDescription>{t('dashboard.chartObatBayarDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {obatData.length === 0 ? (
            <AppEmptyState title={t('common.emptyData')} compact />
          ) : (
            <RankedBarChart data={obatData} color="hsl(var(--chart-1))" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
