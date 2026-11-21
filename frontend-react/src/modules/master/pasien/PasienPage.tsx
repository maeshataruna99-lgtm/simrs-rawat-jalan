/**
 * Halaman master pasien (/master/pasien).
 * Menyediakan pencarian berdasarkan nomor RM, NIK, atau nama, serta tambah, ubah, dan hapus sesuai izin `master-pasien`.
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
import { useCrud } from '@/hooks/use-crud';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { PasienForm } from './PasienForm';
import * as pasienApi from './pasien.api';
import type { PasienItem } from './pasien.types';

const MENU = 'master-pasien';

export default function PasienPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);

  const { items, total, page, perPage, filter, loading, error, setPage, updateFilter, reload } =
    useCrud(pasienApi.listPasien, { q: '' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PasienItem | null>(null);
  const [deleting, setDeleting] = useState<PasienItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns: AppColumn<PasienItem>[] = [
    {
      key: 'no_rm',
      header: t('master.pasien.noRm'),
      cell: (row) => <span className="font-mono font-medium">{row.no_rm}</span>,
      sortValue: (row) => row.no_rm,
    },
    {
      key: 'nik',
      header: t('master.pasien.nik'),
      cell: (row) => <span className="font-mono">{row.nik}</span>,
      sortValue: (row) => row.nik,
    },
    {
      key: 'nama',
      header: t('master.pasien.nama'),
      cell: (row) => row.nama,
      sortValue: (row) => row.nama,
    },
    {
      key: 'tgl_lahir',
      header: t('master.pasien.tglLahir'),
      cell: (row) => row.tgl_lahir,
    },
    {
      key: 'jenis_kelamin',
      header: t('master.pasien.jenisKelamin'),
      cell: (row) => (row.jenis_kelamin === 'L' ? t('master.pasien.jkL') : t('master.pasien.jkP')),
    },
    {
      key: 'no_hp',
      header: t('master.pasien.noHp'),
      cell: (row) => row.no_hp ?? '-',
    },
  ];

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setActionError(null);
    try {
      await pasienApi.deletePasien(deleting.id);
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
        <h1 className="text-2xl font-semibold">{t('master.pasien.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('master.pasien.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('master.pasien.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('master.pasien.addButton')}
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

      <PasienForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => void reload()}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('master.pasien.deleteTitle')}
        description={t('master.pasien.deleteConfirm', { nama: deleting?.nama ?? '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
