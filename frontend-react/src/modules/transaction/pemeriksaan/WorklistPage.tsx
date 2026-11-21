/**
 * Halaman worklist dokter (/transaction/pemeriksaan): pasien hari ini yang menunggu atau sedang diperiksa.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api-client';
import type { KunjunganItem } from '@/modules/transaction/pendaftaran/pendaftaran.types';
import * as pemeriksaanApi from './pemeriksaan.api';

export default function WorklistPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<KunjunganItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pemeriksaanApi
      .worklist()
      .then(setRows)
      .catch((err) => setError(errorMessage(err, t('common.loadFailed'))))
      .finally(() => setLoading(false));
  }, [t]);

  const columns: AppColumn<KunjunganItem>[] = [
    {
      key: 'no_antrean',
      header: t('transaction.pendaftaran.queueNumber'),
      cell: (row) => <span className="font-mono text-base font-bold">#{row.no_antrean}</span>,
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
    </div>
  );
}
