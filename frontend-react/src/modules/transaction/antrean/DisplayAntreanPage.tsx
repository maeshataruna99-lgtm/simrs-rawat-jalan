/**
 * Halaman layar display antrean ruang tunggu (/display-antrean).
 * Dapat dibuka tanpa login, menampilkan nomor antrean yang sedang diperiksa dan daftar antrean berikutnya
 * per poli dengan pembaruan otomatis setiap 10 detik, jam real-time, filter poli, dan mode layar penuh.
 *
 * Dipakai di: routes/index.tsx.
 */
import { Maximize2, Minimize2, Monitor, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppEmptyState } from '@/components/AppEmptyState';
import { AppLocaleToggle } from '@/components/AppLocaleToggle';
import { AppThemeToggle } from '@/components/AppThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueueAnnouncement } from '@/hooks/use-queue-announcement';
import { errorMessage } from '@/lib/api-client';
import * as pendaftaranApi from '@/modules/transaction/pendaftaran/pendaftaran.api';
import type { DisplayAntreanResponse } from '@/modules/transaction/pendaftaran/pendaftaran.types';

const REFRESH_MS = 10_000;

function formatClock(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale === 'en' ? 'en-US' : 'id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDateHeader(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DisplayAntreanPage() {
  const { t, i18n } = useTranslation();

  const [poliId, setPoliId] = useState<number | ''>('');
  const [data, setData] = useState<DisplayAntreanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { announce, audioEnabled, enableAudio } = useQueueAnnouncement();
  // null = belum ada data untuk filter ini; muatan pertama hanya mencatat, tidak memanggil.
  const calledIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    calledIds.current = null;
  }, [poliId]);

  useEffect(() => {
    if (!data) return;
    const entries = data.poli.flatMap((group) => group.sedang_diperiksa);
    const previous = calledIds.current;
    calledIds.current = new Set(entries.map((entry) => entry.id));
    if (!previous) return;
    const fresh = entries.filter((entry) => !previous.has(entry.id));
    void (async () => {
      for (const entry of fresh) await announce(entry.kode_antrean);
    })();
  }, [data, announce]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await pendaftaranApi.getDisplayAntrean({ poli_id: poliId });
      setData(res);
    } catch (err) {
      setError(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [poliId, t]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      await load();
    })();
    const timer = window.setInterval(() => {
      if (active) {
        void load();
      }
    }, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 text-foreground flex flex-col">
      <header className="border-b bg-background px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Monitor className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {t('transaction.antrean.display.title')}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t('transaction.antrean.display.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label={t('transaction.pendaftaran.poli')}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={poliId}
              onChange={(e) => setPoliId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">{t('transaction.pendaftaran.allPoli')}</option>
              {(data?.poli_list ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              aria-label={t('transaction.antrean.display.refresh')}
            >
              <RefreshCw className="mr-1.5 size-4" />
              {t('transaction.antrean.display.refresh')}
            </Button>

            <Button
              type="button"
              variant={audioEnabled ? 'secondary' : 'outline'}
              size="sm"
              disabled={audioEnabled}
              onClick={() => void enableAudio()}
            >
              {audioEnabled ? (
                <Volume2 className="mr-1.5 size-4" />
              ) : (
                <VolumeX className="mr-1.5 size-4" />
              )}
              {audioEnabled
                ? t('transaction.antrean.display.soundOn')
                : t('transaction.antrean.display.enableSound')}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="mr-1.5 size-4" />
                  {t('transaction.antrean.display.exitFullscreen')}
                </>
              ) : (
                <>
                  <Maximize2 className="mr-1.5 size-4" />
                  {t('transaction.antrean.display.fullscreen')}
                </>
              )}
            </Button>

            <AppLocaleToggle />
            <AppThemeToggle />

            <div className="text-right pl-2 border-l">
              <div className="font-mono text-2xl font-bold leading-none tabular-nums">
                {formatClock(now, i18n.language)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDateHeader(now, i18n.language)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-6">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {loading && !data ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1, 2, 3].map((idx) => (
              <Skeleton key={idx} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : !data || data.poli.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <AppEmptyState title={t('transaction.antrean.display.emptyPoli')} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {data.poli.map((group) => (
              <Card key={group.poli_id} className="overflow-hidden border-2">
                <CardHeader className="bg-muted/50 pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono text-xs">
                        {group.poli_kode}
                      </Badge>
                      <CardTitle className="text-xl">{group.poli_nama}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">
                        {t('transaction.antrean.display.waitingCount')}: {group.total_menunggu}
                      </Badge>
                      <Badge variant="secondary">
                        {t('transaction.antrean.display.doneCount')}: {group.total_selesai}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  <div className="rounded-xl bg-primary/10 border border-primary/25 p-5 text-center">
                    <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                      {t('transaction.antrean.display.nowServing')}
                    </div>
                    {group.sedang_diperiksa.length > 0 ? (
                      <div className="mt-2 space-y-3">
                        {group.sedang_diperiksa.map((entry) => (
                          <div key={entry.id} className="space-y-1">
                            <div className="font-mono text-5xl font-extrabold tracking-wider text-primary sm:text-6xl">
                              {entry.kode_antrean}
                            </div>
                            <div className="text-base font-medium">
                              {entry.inisial_pasien} &middot;{' '}
                              <span className="text-muted-foreground">{entry.dokter_nama}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-sm text-muted-foreground">
                        {t('transaction.antrean.display.noActiveCall')}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('transaction.antrean.display.nextQueue')}
                    </div>
                    {group.menunggu.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {group.menunggu.slice(0, 6).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border bg-background px-3 py-2 text-center"
                          >
                            <div className="font-mono text-lg font-bold">{item.kode_antrean}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {item.inisial_pasien}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('transaction.antrean.display.noWaiting')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
