/**
 * Halaman master dokter dan tenaga medis (/master/dokter).
 * Menyediakan filter jenis tenaga, pencarian, serta tambah, ubah, dan hapus sesuai izin `master-dokter`.
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
import { DokterForm } from './DokterForm';
import * as dokterApi from './dokter.api';
import type { DokterItem, JenisTenaga } from './dokter.types';

const MENU = 'master-dokter';
const JENIS_TENAGA_LIST: JenisTenaga[] = ['dokter', 'perawat', 'analis', 'apoteker'];

const selectClassName =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function DokterPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);

  const { items, total, page, perPage, filter, loading, error, setPage, updateFilter, reload } =
    useCrud(dokterApi.listDokter, { q: '', jenis_tenaga: '' as JenisTenaga | '' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DokterItem | null>(null);
  const [deleting, setDeleting] = useState<DokterItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns: AppColumn<DokterItem>[] = [
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
      key: 'sip',
      header: t('master.dokter.sip'),
      cell: (row) => <span className="font-mono text-xs">{row.sip}</span>,
    },
    {
      key: 'jenis_tenaga',
      header: t('master.dokter.jenisTenaga'),
      cell: (row) => t(`master.dokter.jenis.${row.jenis_tenaga}`),
    },
    {
      key: 'spesialis',
      header: t('master.dokter.spesialis'),
      cell: (row) => row.spesialis ?? '-',
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
      await dokterApi.deleteDokter(deleting.id);
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
        <h1 className="text-2xl font-semibold">{t('master.dokter.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('master.dokter.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('master.dokter.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('master.dokter.addButton')}
        onCreate={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <select
          aria-label={t('master.dokter.jenisTenaga')}
          className={selectClassName}
          value={filter.jenis_tenaga}
          onChange={(e) => updateFilter({ jenis_tenaga: e.target.value as JenisTenaga | '' })}
        >
          <option value="">{t('master.dokter.allJenisTenaga')}</option>
          {JENIS_TENAGA_LIST.map((jenis) => (
            <option key={jenis} value={jenis}>
              {t(`master.dokter.jenis.${jenis}`)}
            </option>
          ))}
        </select>
      </AppFilterBar>

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

      <DokterForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => void reload()}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('master.dokter.deleteTitle')}
        description={t('master.dokter.deleteConfirm', { nama: deleting?.nama ?? '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
