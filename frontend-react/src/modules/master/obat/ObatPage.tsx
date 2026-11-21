/**
 * Halaman master obat dan stok (/master/obat).
 * Menampilkan daftar obat, harga, stok saat ini, dialog penyesuaian stok, dan dialog riwayat mutasi stok.
 *
 * Dipakai di: routes/index.tsx.
 */
import { History, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppFilterBar } from '@/components/AppFilterBar';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCrud } from '@/hooks/use-crud';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRupiah } from '@/lib/format';
import { ObatForm } from './ObatForm';
import { StokAdjustDialog } from './StokAdjustDialog';
import { StokMutasiDialog } from './StokMutasiDialog';
import * as obatApi from './obat.api';
import type { ObatItem } from './obat.types';

const MENU = 'master-obat';

export default function ObatPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);
  const canUpdate = can(MENU, 'update');

  const { items, total, page, perPage, filter, loading, error, setPage, updateFilter, reload } =
    useCrud(obatApi.listObat, { q: '' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ObatItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<ObatItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ObatItem | null>(null);
  const [deleting, setDeleting] = useState<ObatItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns: AppColumn<ObatItem>[] = [
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
      header: t('master.obat.satuan'),
      cell: (row) => row.satuan,
    },
    {
      key: 'harga',
      header: t('master.obat.harga'),
      cell: (row) => formatRupiah(row.harga),
      sortValue: (row) => row.harga,
    },
    {
      key: 'stok',
      header: t('master.obat.stok'),
      cell: (row) => <span className="font-mono font-semibold">{row.stok}</span>,
      sortValue: (row) => row.stok,
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
      await obatApi.deleteObat(deleting.id);
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
        <h1 className="text-2xl font-semibold">{t('master.obat.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('master.obat.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('master.obat.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('master.obat.addButton')}
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
        canUpdate={canUpdate}
        canDelete={can(MENU, 'delete')}
        onEdit={(row) => {
          setEditing(row);
          setFormOpen(true);
        }}
        onDelete={(row) => setDeleting(row)}
        extraActions={(row) => (
          <>
            {canUpdate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdjustTarget(row)}
                aria-label={t('master.obat.adjustButton')}
              >
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />
                {t('master.obat.adjustButton')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryTarget(row)}
              aria-label={t('master.obat.historyButton')}
            >
              <History className="mr-1 h-3.5 w-3.5" />
              {t('master.obat.historyButton')}
            </Button>
          </>
        )}
      />

      <AppPaginator page={page} perPage={perPage} total={total} onPageChange={setPage} />

      <ObatForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={() => void reload()}
      />

      <StokAdjustDialog
        target={adjustTarget}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
        onSaved={() => void reload()}
      />

      <StokMutasiDialog
        target={historyTarget}
        onOpenChange={(open) => !open && setHistoryTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('master.obat.deleteTitle')}
        description={t('master.obat.deleteConfirm', { nama: deleting?.nama ?? '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
