/**
 * Halaman master menu (/system/menu).
 * Menampilkan daftar menu bertingkat beserta modul dan aksi tambah, ubah, dan hapus sesuai izin `system-menu`.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppFilterBar } from '@/components/AppFilterBar';
import { AppIcon } from '@/components/AppIcon';
import { AppPaginator } from '@/components/AppPaginator';
import { Badge } from '@/components/ui/badge';
import { useCrud } from '@/hooks/use-crud';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import * as moduleApi from '@/modules/system/module/module.api';
import type { ModuleItem } from '@/modules/system/module/module.types';
import { MenuForm } from './MenuForm';
import * as menuApi from './menu.api';
import type { SystemMenuItem } from './menu.types';

const MENU = 'system-menu';

export default function MenuPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);

  const { items, total, page, perPage, filter, loading, error, setPage, updateFilter, reload } =
    useCrud(menuApi.listMenus, { q: '' });

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [allMenus, setAllMenus] = useState<SystemMenuItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemMenuItem | null>(null);
  const [deleting, setDeleting] = useState<SystemMenuItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void moduleApi
      .listModules({ per_page: 100 })
      .then((res) => setModules(res.items))
      .catch(() => {});
    void menuApi
      .listMenus({ per_page: 100 })
      .then((res) => setAllMenus(res.items))
      .catch(() => {});
  }, [items]);

  const moduleMap = useMemo(() => new Map(modules.map((m) => [m.id, m.nama])), [modules]);

  const columns: AppColumn<SystemMenuItem>[] = [
    {
      key: 'kode',
      header: t('system.common.kode'),
      cell: (row) => <span className="font-mono">{row.kode}</span>,
      sortValue: (row) => row.kode,
    },
    {
      key: 'nama',
      header: t('system.common.nama'),
      cell: (row) => (
        <span className="inline-flex items-center gap-2">
          <AppIcon icon={row.icon} className="h-4 w-4 text-muted-foreground" />
          <span>{row.nama}</span>
        </span>
      ),
      sortValue: (row) => row.nama,
    },
    {
      key: 'module_id',
      header: t('system.menu.module'),
      cell: (row) => (row.module_id ? (moduleMap.get(row.module_id) ?? '-') : '-'),
    },
    {
      key: 'path',
      header: t('system.menu.path'),
      cell: (row) => <span className="font-mono text-xs">{row.path ?? '-'}</span>,
    },
    {
      key: 'urutan',
      header: t('system.common.urutan'),
      cell: (row) => row.urutan,
      sortValue: (row) => row.urutan,
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
      await menuApi.deleteMenu(deleting.id);
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
        <h1 className="text-2xl font-semibold">{t('system.menu.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('system.menu.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('system.menu.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('system.menu.addButton')}
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

      <MenuForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        modules={modules}
        allMenus={allMenus}
        onSaved={() => void reload()}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('system.menu.deleteTitle')}
        description={t('system.menu.deleteConfirm', { nama: deleting?.nama ?? '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
