/**
 * Halaman worklist dan input hasil laboratorium (/transaction/laboratorium).
 * Flag tinggi/rendah dihitung Yii dari nilai rujukan saat hasil disimpan.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppDateRange } from '@/components/AppDateRange';
import { AppFilterBar } from '@/components/AppFilterBar';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCrud } from '@/hooks/use-crud';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { hariIni } from '@/lib/format';
import * as labApi from './lab.api';
import type { OrderLabDetailItem } from './lab.api';
import { LabHasilBadge } from './LabHasilBadge';

const MENU = 'laboratorium';
const STATUS_OPTIONS = ['diminta,diproses', 'diminta', 'diproses', 'selesai'] as const;

const selectClassName =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Baris input hasil satu pemeriksaan. */
function HasilRow({
  detail,
  canUpdate,
  onSaved,
}: {
  detail: OrderLabDetailItem;
  canUpdate: boolean;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [hasil, setHasil] = useState(detail.hasil ?? '');
  const [saving, setSaving] = useState(false);
  const nama = detail.pemeriksaan?.nama ?? '-';

  const save = async () => {
    setSaving(true);
    try {
      await labApi.simpanHasilLab(detail.id, hasil);
      toast.success(t('transaction.lab.resultSaved'));
      await onSaved();
    } catch (err) {
      toast.error(
        Object.values(fieldErrors(err)).flat()[0] ?? errorMessage(err, t('common.saveFailed')),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid items-center gap-2 py-2 text-sm sm:grid-cols-[1fr_10rem_auto_8rem]">
      <div>
        <div className="font-medium">{nama}</div>
        <div className="text-xs text-muted-foreground">
          {t('transaction.lab.nilaiRujukan')}: {detail.nilai_rujukan ?? '-'} {detail.satuan ?? ''}
        </div>
      </div>
      {canUpdate ? (
        <>
          <Input
            aria-label={`${t('transaction.lab.hasil')} ${nama}`}
            value={hasil}
            onChange={(e) => setHasil(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={saving || hasil.trim() === ''}
            onClick={() => void save()}
          >
            {t('common.save')}
          </Button>
        </>
      ) : (
        <span className="sm:col-span-2" />
      )}
      <LabHasilBadge detail={detail} />
    </div>
  );
}

export default function LaboratoriumPage() {
  const { t } = useTranslation();
  const canUpdate = useAuthStore((s) => s.can)(MENU, 'update');
  const {
    items: orders,
    total,
    page,
    perPage,
    filter,
    loading,
    error,
    setPage,
    setPerPage,
    updateFilter,
    reload,
  } = useCrud(labApi.worklistLab, {
    q: '',
    status: STATUS_OPTIONS[0] as string,
    tanggal_dari: hariIni(),
    tanggal_sampai: hariIni(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('transaction.lab.worklistTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('transaction.lab.worklistSubtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('transaction.lab.searchWorklist')}
      >
        <AppDateRange
          dari={filter.tanggal_dari}
          sampai={filter.tanggal_sampai}
          onChange={updateFilter}
        />
        <select
          aria-label={t('system.common.status')}
          className={selectClassName}
          value={filter.status}
          onChange={(e) => updateFilter({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.includes(',')
                ? t('transaction.lab.activeStatus')
                : t(`transaction.lab.status.${s}`)}
            </option>
          ))}
        </select>
      </AppFilterBar>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Muat ulang setelah simpan hasil tetap menampilkan kartu agar detail yang terbuka tidak tertutup. */}
      {loading && orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.emptyData')}</p>
      ) : (
        orders.map((order) => (
          <Card key={order.id} data-testid="lab-order">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">
                  {order.pasien?.nama ?? '-'}{' '}
                  <span className="font-mono text-xs text-muted-foreground">
                    {order.pasien?.no_rm}
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {order.no_order} · {order.poli?.nama ?? '-'} · {order.dokter?.nama ?? '-'}
                </p>
                {order.catatan_klinis && <p className="text-sm">{order.catatan_klinis}</p>}
              </div>
              <Badge variant="outline">{t(`transaction.lab.status.${order.status}`)}</Badge>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  {t('transaction.lab.pemeriksaanCount', { count: order.details.length })}:{' '}
                  {order.details.map((d) => d.pemeriksaan?.nama).join(', ')}
                </summary>
                <div className="divide-y">
                  {order.details.map((d) => (
                    <HasilRow
                      key={`${d.id}-${d.hasil ?? ''}`}
                      detail={d}
                      canUpdate={canUpdate && order.status !== 'selesai'}
                      onSaved={reload}
                    />
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>
        ))
      )}
      <AppPaginator
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />
    </div>
  );
}
