/**
 * Halaman master tindakan medis dan tarif (/master/tindakan).
 * Menyediakan filter per poli, pencarian, serta tambah, ubah, dan hapus sesuai izin `master-tindakan`.
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
import { formatRupiah } from '@/lib/format';
import * as poliApi from '@/modules/master/poli/poli.api';
import type { PoliItem } from '@/modules/master/poli/poli.types';
import { TindakanForm } from './TindakanForm';
import * as tindakanApi from './tindakan.api';
import type { TindakanItem } from './tindakan.types';

const MENU = 'master-tindakan';

const selectClassName =
  'flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function TindakanPage() {
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
  } = useCrud(tindakanApi.listTindakan, { q: '', poli_id: '' as number | '' });

  const [poliList, setPoliList] = useState<PoliItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TindakanItem | null>(null);
  const [deleting, setDeleting] = useState<TindakanItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void poliApi
      .listPoli({ per_page: 100 })
      .then((res) => setPoliList(res.items))
      .catch(() => {});
  }, []);

  const columns: AppColumn<TindakanItem>[] = [
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
      key: 'poli',
      header: t('master.tindakan.poli'),
      cell: (row) => row.poli?.nama ?? t('master.tindakan.semuaPoli'),
    },
    {
      key: 'tarif',
      header: t('master.tindakan.tarif'),
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
      await tindakanApi.deleteTindakan(deleting.id);
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
        <h1 className="text-2xl font-semibold">{t('master.tindakan.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('master.tindakan.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('master.tindakan.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('master.tindakan.addButton')}
        onCreate={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <select
          aria-label={t('master.tindakan.poli')}
          className={selectClassName}
          value={filter.poli_id}
          onChange={(e) => updateFilter({ poli_id: e.target.value ? Number(e.target.value) : '' })}
        >
          <option value="">{t('master.tindakan.semuaPoli')}</option>
          {poliList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
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

      <AppPaginator
        page={page}
        perPage={perPage}
        total={total}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
      />

      <TindakanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        poliList={poliList}
        onSaved={() => void reload()}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('master.tindakan.deleteTitle')}
        description={t('master.tindakan.deleteConfirm', { nama: deleting?.nama ?? '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
