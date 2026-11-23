/**
 * Halaman antrean dan penyerahan resep farmasi (/transaction/farmasi).
 * Alur status: baru -> diproses -> diserahkan; stok obat berkurang saat diserahkan.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRupiah } from '@/lib/format';
import * as resepApi from './resep.api';
import type { ResepItem, ResepStatus } from './resep.api';

const MENU = 'farmasi';

const selectClassName =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function FarmasiPage() {
  const { t } = useTranslation();
  const canUpdate = useAuthStore((s) => s.can)(MENU, 'update');
  const [status, setStatus] = useState<ResepStatus | ''>('');
  const [rows, setRows] = useState<ResepItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      setRows(await resepApi.antreanFarmasi({ status }));
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    void (async () => {
      await reload();
    })();
  }, [reload]);

  const ubah = async (id: number, aksi: 'proses' | 'serahkan') => {
    setBusyId(id);
    try {
      await resepApi.ubahStatusResep(id, aksi);
      toast.success(t(`transaction.farmasi.${aksi}Success`));
      await reload();
    } catch (err) {
      toast.error(errorMessage(err, t('common.saveFailed')));
    } finally {
      setBusyId(null);
    }
  };

  const columns: AppColumn<ResepItem>[] = [
    {
      key: 'no_resep',
      header: t('transaction.farmasi.noResep'),
      className: 'whitespace-nowrap',
      cell: (row) => <span className="font-mono text-xs">{row.no_resep}</span>,
    },
    {
      key: 'pasien',
      header: t('master.pasien.nama'),
      cell: (row) => (
        <div>
          <div className="font-medium">{row.pasien?.nama ?? '-'}</div>
          <div className="font-mono text-xs text-muted-foreground">{row.pasien?.no_rm ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'dokter',
      header: t('master.jadwal.dokter'),
      cell: (row) => (
        <div>
          <div>{row.dokter?.nama ?? '-'}</div>
          <div className="text-xs text-muted-foreground">{row.poli?.nama ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'obat',
      header: t('transaction.resep.title'),
      className: 'max-w-[240px]',
      cell: (row) => (
        <ul className="space-y-0.5 text-xs leading-snug">
          {row.details.map((d) => (
            <li key={d.id} className="break-words">
              {d.obat?.nama} · {d.jumlah} {d.obat?.satuan} · {d.dosis} {d.frekuensi}
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: 'total',
      header: t('transaction.resep.total'),
      className: 'whitespace-nowrap text-right',
      cell: (row) => formatRupiah(row.total),
    },
    {
      key: 'status',
      header: t('system.common.status'),
      className: 'whitespace-nowrap',
      cell: (row) => (
        <Badge variant={row.status === 'diserahkan' ? 'default' : 'outline'}>
          {t(`transaction.resep.status.${row.status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('transaction.farmasi.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('transaction.farmasi.subtitle')}</p>
      </div>

      <select
        aria-label={t('system.common.status')}
        className={selectClassName}
        value={status}
        onChange={(e) => setStatus(e.target.value as ResepStatus | '')}
      >
        <option value="">{t('transaction.farmasi.activeStatus')}</option>
        {(['baru', 'diproses', 'diserahkan', 'batal'] as const).map((s) => (
          <option key={s} value={s}>
            {t(`transaction.resep.status.${s}`)}
          </option>
        ))}
      </select>

      <AppDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        extraActions={
          canUpdate
            ? (row) =>
                row.status === 'baru' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => void ubah(row.id, 'proses')}
                  >
                    {t('transaction.farmasi.prosesButton')}
                  </Button>
                ) : row.status === 'diproses' ? (
                  <Button
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => void ubah(row.id, 'serahkan')}
                  >
                    {t('transaction.farmasi.serahkanButton')}
                  </Button>
                ) : null
            : undefined
        }
      />
    </div>
  );
}
