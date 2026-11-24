/**
 * Halaman worklist dokter (/transaction/pemeriksaan): pasien yang menunggu atau sedang diperiksa, bawaan hari ini.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppDateRange } from '@/components/AppDateRange';
import { AppFilterBar } from '@/components/AppFilterBar';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCrud } from '@/hooks/use-crud';
import { hariIni } from '@/lib/format';
import type { KunjunganItem } from '@/modules/transaction/pendaftaran/pendaftaran.types';
import * as pemeriksaanApi from './pemeriksaan.api';

export default function WorklistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, total, page, perPage, filter, loading, error, setPage, setPerPage, updateFilter } =
    useCrud(pemeriksaanApi.worklist, {
      q: '',
      tanggal_dari: hariIni(),
      tanggal_sampai: hariIni(),
    });

  const columns: AppColumn<KunjunganItem>[] = [
    {
      key: 'no_antrean',
      header: t('transaction.pendaftaran.queueNumber'),
      cell: (row) => (
        <span className="font-mono text-base font-bold">
          {row.kode_antrean ?? `#${row.no_antrean}`}
        </span>
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
    },
    {
      key: 'poli',
      header: t('transaction.pendaftaran.poli'),
      cell: (row) => row.poli?.nama ?? '-',
    },
    { key: 'dokter', header: t('master.jadwal.dokter'), cell: (row) => row.dokter?.nama ?? '-' },
    {
      key: 'tgl_kunjungan',
      header: t('transaction.pendaftaran.tglKunjungan'),
      className: 'whitespace-nowrap',
      cell: (row) => row.tgl_kunjungan,
    },
    {
      key: 'status',
      header: t('system.common.status'),
      cell: (row) => (
        <Badge variant={row.status === 'diperiksa' ? 'secondary' : 'outline'}>
          {t(`transaction.antrean.status.${row.status}`)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('transaction.pemeriksaan.worklistTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('transaction.pemeriksaan.worklistSubtitle')}
        </p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('transaction.pemeriksaan.searchPlaceholder')}
      >
        <AppDateRange
          dari={filter.tanggal_dari}
          sampai={filter.tanggal_sampai}
          onChange={updateFilter}
        />
      </AppFilterBar>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <AppDataTable
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        extraActions={(row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigate(`/transaction/pemeriksaan/${row.id}`)}
          >
            {t('transaction.pemeriksaan.examineButton')}
          </Button>
        )}
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
