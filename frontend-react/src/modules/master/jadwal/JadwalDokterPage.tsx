/**
 * Halaman master jadwal praktik dokter (/master/jadwal-dokter).
 * Menampilkan daftar jadwal per hari, dokter, poli, jam praktik, dan kuota pasien.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppFilterBar } from '@/components/AppFilterBar';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { useCrud } from '@/hooks/use-crud';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import * as dokterApi from '@/modules/master/dokter/dokter.api';
import type { DokterItem } from '@/modules/master/dokter/dokter.types';
import * as poliApi from '@/modules/master/poli/poli.api';
import type { PoliItem } from '@/modules/master/poli/poli.types';
import { JadwalDokterForm } from './JadwalDokterForm';
import * as jadwalApi from './jadwal.api';
import type { JadwalDokterItem } from './jadwal.types';

const MENU = 'master-jadwal-dokter';

export default function JadwalDokterPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);

  const { items, total, page, perPage, filter, loading, error, setPage, updateFilter, reload } =
    useCrud(jadwalApi.listJadwalDokter, { q: '' });

  const [dokterList, setDokterList] = useState<DokterItem[]>([]);
  const [poliList, setPoliList] = useState<PoliItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JadwalDokterItem | null>(null);
  const [deleting, setDeleting] = useState<JadwalDokterItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void dokterApi
      .listDokter({ jenis_tenaga: 'dokter', per_page: 100 })
      .then((res) => setDokterList(res.items))
      .catch(() => {});
    void poliApi
      .listPoli({ per_page: 100 })
      .then((res) => setPoliList(res.items))
      .catch(() => {});
  }, []);

  const columns: AppColumn<JadwalDokterItem>[] = [
    {
      key: 'hari',
      header: t('master.jadwal.hari'),
      cell: (row) => row.hari_nama ?? String(row.hari),
      sortValue: (row) => row.hari,
    },
    {
      key: 'dokter',
      header: t('master.jadwal.dokter'),
      cell: (row) => row.dokter?.nama ?? '-',
      sortValue: (row) => row.dokter?.nama ?? '',
    },
    {
      key: 'poli',
      header: t('master.jadwal.poli'),
      cell: (row) => row.poli?.nama ?? '-',
      sortValue: (row) => row.poli?.nama ?? '',
    },
    {
      key: 'jam',
      header: `${t('master.jadwal.jamMulai')} - ${t('master.jadwal.jamSelesai')}`,
      cell: (row) => (
        <span className="font-mono">
          {row.jam_mulai} - {row.jam_selesai}
        </span>
      ),
    },
    {
      key: 'kuota',
      header: t('master.jadwal.kuota'),
      cell: (row) => row.kuota,
      sortValue: (row) => row.kuota,
    },
    {
      key: 'is_active',
      header: t('system.common.status'),
      cell: (row) => (
        <Badge variant={row.is_active ? 'default' : 'secondary'}>
          {row.is_active ? t('system.common.active') : t('system.common.inactive')}
        </Badge>
      ),
    },
  ];

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setActionError(null);
    try {
      await jadwalApi.deleteJadwalDokter(deleting.id);
      toast.success(t('common.deleteSuccess'));
      setDeleting(null);
      await reload();
    } catch (err) {
      const msg = errorMessage(err, t('common.deleteFailed'));
      setActionError(msg);
      toast.error(msg);
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('master.jadwal.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('master.jadwal.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('master.jadwal.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('master.jadwal.addButton')}
        onCreate={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      />

      {(error || actionError) && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError ?? error}
        </p>
      )}

      <AppDataTable
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        canUpdate={can(MENU, 'update')}
        canDelete={can(MENU, 'delete')}
        onEdit={(row) => {
          setEditing(row);
          setFormOpen(true);
        }}
        onDelete={(row) => setDeleting(row)}
      />

      <AppPaginator page={page} perPage={perPage} total={total} onPageChange={setPage} />

      <JadwalDokterForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        dokterList={dokterList}
        poliList={poliList}
        onSaved={() => void reload()}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('master.jadwal.deleteTitle')}
        description={t('master.jadwal.deleteConfirm', {
          nama: `${deleting?.dokter?.nama ?? ''} (${deleting?.hari_nama ?? ''})`,
        })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
