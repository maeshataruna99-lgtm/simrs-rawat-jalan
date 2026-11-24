/**
 * Halaman antrean poli (/transaction/antrean).
 * Menampilkan daftar antrean pasien per poli dan tanggal serta aksi perubahan status
 * (menunggu -> diperiksa -> selesai / batal) sesuai izin `antrean:update`.
 *
 * Dipakai di: routes/index.tsx.
 */
import { Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppDateRange } from '@/components/AppDateRange';
import { AppFilterBar } from '@/components/AppFilterBar';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCrud } from '@/hooks/use-crud';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { hariIni } from '@/lib/format';
import * as poliApi from '@/modules/master/poli/poli.api';
import type { PoliItem } from '@/modules/master/poli/poli.types';
import * as pendaftaranApi from '@/modules/transaction/pendaftaran/pendaftaran.api';
import type {
  KunjunganItem,
  KunjunganStatus,
} from '@/modules/transaction/pendaftaran/pendaftaran.types';

const MENU = 'antrean';

const selectClassName =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const STATUS_BADGE: Record<KunjunganStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  menunggu: 'outline',
  diperiksa: 'secondary',
  selesai: 'default',
  batal: 'destructive',
};

export default function AntreanPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);
  const canUpdate = can(MENU, 'update');

  const [poliList, setPoliList] = useState<PoliItem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  // Bawaan hari ini agar daftar tidak memuat seluruh antrean lintas tanggal.
  const {
    items: rows,
    total,
    page,
    perPage,
    filter,
    loading,
    error: loadError,
    setPage,
    setPerPage,
    updateFilter,
    reload,
  } = useCrud(pendaftaranApi.listAntrean, {
    q: '',
    poli_id: '' as number | '',
    status: '' as KunjunganStatus | '',
    tanggal_dari: hariIni(),
    tanggal_sampai: hariIni(),
  });
  const error = actionError ?? loadError;

  useEffect(() => {
    void poliApi
      .listPoli({ per_page: 100 })
      .then((res) => setPoliList(res.items))
      .catch(() => {});
  }, []);

  const handleStatusChange = async (id: number, targetStatus: KunjunganStatus) => {
    setActionError(null);
    try {
      await pendaftaranApi.ubahStatusAntrean(id, targetStatus);
      toast.success(t('transaction.antrean.statusUpdated'));
      await reload();
    } catch (err) {
      const msg = errorMessage(err, t('common.saveFailed'));
      setActionError(msg);
      toast.error(msg);
    }
  };

  const columns: AppColumn<KunjunganItem>[] = [
    {
      key: 'no_antrean',
      header: t('transaction.pendaftaran.queueNumber'),
      className: 'whitespace-nowrap',
      cell: (row) => (
        <div>
          <div className="font-mono text-base font-bold">
            {row.kode_antrean ?? `#${row.no_antrean}`}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{row.no_kunjungan}</div>
        </div>
      ),
      sortValue: (row) => row.no_antrean,
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
      sortValue: (row) => row.pasien?.nama ?? '',
    },
    {
      key: 'poli_dokter',
      header: t('transaction.billing.colPoliDokter'),
      cell: (row) => (
        <div>
          <div>{row.poli?.nama ?? '-'}</div>
          <div className="text-xs text-muted-foreground">{row.dokter?.nama ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'tgl_kunjungan',
      header: t('transaction.pendaftaran.tglKunjungan'),
      className: 'whitespace-nowrap',
      cell: (row) => row.tgl_kunjungan,
    },
    {
      key: 'status',
      header: t('system.common.status'),
      className: 'whitespace-nowrap',
      cell: (row) => (
        <Badge variant={STATUS_BADGE[row.status]}>
          {t(`transaction.antrean.status.${row.status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{t('transaction.antrean.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('transaction.antrean.subtitle')}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/display-antrean" target="_blank" rel="noopener noreferrer">
            <Monitor className="mr-1.5 size-4" />
            {t('transaction.antrean.openDisplay')}
          </Link>
        </Button>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('transaction.antrean.searchPlaceholder')}
      >
        <AppDateRange
          dari={filter.tanggal_dari}
          sampai={filter.tanggal_sampai}
          onChange={updateFilter}
        />
        <select
          aria-label={t('transaction.pendaftaran.poli')}
          className={selectClassName}
          value={filter.poli_id}
          onChange={(e) => updateFilter({ poli_id: e.target.value ? Number(e.target.value) : '' })}
        >
          <option value="">{t('transaction.pendaftaran.allPoli')}</option>
          {poliList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>
        <select
          aria-label={t('system.common.status')}
          className={selectClassName}
          value={filter.status}
          onChange={(e) => updateFilter({ status: e.target.value as KunjunganStatus | '' })}
        >
          <option value="">{t('transaction.antrean.allStatus')}</option>
          <option value="menunggu">{t('transaction.antrean.status.menunggu')}</option>
          <option value="diperiksa">{t('transaction.antrean.status.diperiksa')}</option>
          <option value="selesai">{t('transaction.antrean.status.selesai')}</option>
          <option value="batal">{t('transaction.antrean.status.batal')}</option>
        </select>
      </AppFilterBar>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <AppDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        extraActions={
          canUpdate
            ? (row) => (
                <>
                  {row.status === 'menunggu' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleStatusChange(row.id, 'diperiksa')}
                      >
                        {t('transaction.antrean.callButton')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleStatusChange(row.id, 'batal')}
                      >
                        {t('transaction.antrean.cancelButton')}
                      </Button>
                    </>
                  )}
                  {row.status === 'diperiksa' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleStatusChange(row.id, 'selesai')}
                    >
                      {t('transaction.antrean.finishButton')}
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />
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
