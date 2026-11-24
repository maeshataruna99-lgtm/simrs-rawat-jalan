/**
 * Halaman master pemeriksaan laboratorium (/master/pemeriksaan-lab).
 * Menampilkan parameter pemeriksaan, satuan, nilai rujukan, dan tarif sesuai izin `master-pemeriksaan-lab`.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useState } from 'react';
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
import { formatRupiah } from '@/lib/format';
import { PemeriksaanLabForm } from './PemeriksaanLabForm';
import * as labApi from './lab.api';
import type { PemeriksaanLabItem } from './lab.types';

const MENU = 'master-pemeriksaan-lab';

export default function PemeriksaanLabPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);

  const {
    items,
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
  } = useCrud(labApi.listPemeriksaanLab, { q: '' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PemeriksaanLabItem | null>(null);
  const [deleting, setDeleting] = useState<PemeriksaanLabItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns: AppColumn<PemeriksaanLabItem>[] = [
    {
      key: 'kode',
      header: t('system.common.kode'),
      cell: (row) => <span className="font-mono">{row.kode}</span>,
      sortValue: (row) => row.kode,
    },
    {
      key: 'nama',
      header: t('system.common.nama'),
      cell: (row) => row.nama,
      sortValue: (row) => row.nama,
    },
    {
      key: 'satuan',
      header: t('master.lab.satuan'),
      cell: (row) => row.satuan ?? '-',
    },
    {
      key: 'nilai_rujukan',
      header: t('master.lab.nilaiRujukan'),
      cell: (row) => row.nilai_rujukan ?? '-',
    },
    {
      key: 'tarif',
      header: t('master.lab.tarif'),
      cell: (row) => formatRupiah(row.tarif),
      sortValue: (row) => row.tarif,
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
      await labApi.deletePemeriksaanLab(deleting.id);
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
        <h1 className="text-2xl font-semibold">{t('master.lab.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('master.lab.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('master.lab.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('master.lab.addButton')}
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

      <AppPaginator
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      <PemeriksaanLabForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => void reload()}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('master.lab.deleteTitle')}
        description={t('master.lab.deleteConfirm', { nama: deleting?.nama ?? '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
