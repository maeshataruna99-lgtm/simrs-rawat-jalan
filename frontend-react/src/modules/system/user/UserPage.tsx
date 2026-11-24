/**
 * Halaman master pengguna (/system/user).
 * Menyediakan tambah user (dengan password), ubah user (tanpa password), reset password,
 * toggle aktif/nonaktif, dan hapus sesuai izin `system-user`.
 *
 * Dipakai di: routes/index.tsx.
 */
import { KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppFilterBar } from '@/components/AppFilterBar';
import { AppPaginator } from '@/components/AppPaginator';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useCrud } from '@/hooks/use-crud';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import * as roleApi from '@/modules/system/role/role.api';
import type { RoleItem } from '@/modules/system/role/role.types';
import { ResetPasswordDialog } from './ResetPasswordDialog';
import { UserForm } from './UserForm';
import * as userApi from './user.api';
import type { UserItem } from './user.types';

const MENU = 'system-user';

export default function UserPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);
  const canUpdate = can(MENU, 'update');

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
  } = useCrud(userApi.listUsers, { q: '' });

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [deleting, setDeleting] = useState<UserItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void roleApi
      .listRoles({ per_page: 100 })
      .then((res) => setRoles(res.items))
      .catch(() => {});
  }, []);

  const handleToggleActive = async (row: UserItem) => {
    setActionError(null);
    try {
      await userApi.updateUser(row.id, { is_active: !row.is_active });
      toast.success(t('common.saveSuccess'));
      await reload();
    } catch (err) {
      const fields = fieldErrors(err);
      const msg = fields.is_active?.[0] ?? errorMessage(err, t('common.saveFailed'));
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setActionError(null);
    try {
      await userApi.deleteUser(deleting.id);
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

  const columns: AppColumn<UserItem>[] = [
    {
      key: 'username',
      header: t('auth.username'),
      cell: (row) => <span className="font-mono">{row.username}</span>,
      sortValue: (row) => row.username,
    },
    {
      key: 'nama',
      header: t('system.common.nama'),
      cell: (row) => row.nama,
      sortValue: (row) => row.nama,
    },
    {
      key: 'role',
      header: t('system.user.role'),
      cell: (row) => row.role?.nama ?? '-',
    },
    {
      key: 'is_active',
      header: t('system.common.status'),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.is_active}
            disabled={!canUpdate}
            aria-label={t('system.user.toggleActiveLabel', { username: row.username })}
            onCheckedChange={() => void handleToggleActive(row)}
          />
          <span className="text-xs text-muted-foreground">
            {row.is_active ? t('system.common.active') : t('system.common.inactive')}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('system.user.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('system.user.subtitle')}</p>
      </div>

      <AppFilterBar
        searchValue={filter.q}
        onSearchChange={(q) => updateFilter({ q })}
        searchPlaceholder={t('system.user.searchPlaceholder')}
        canCreate={can(MENU, 'create')}
        createLabel={t('system.user.addButton')}
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
        extraActions={
          canUpdate
            ? (row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetTarget(row)}
                  aria-label={t('system.user.resetPasswordButton')}
                >
                  <KeyRound className="mr-1 h-3.5 w-3.5" />
                  {t('system.user.resetPasswordButton')}
                </Button>
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

      <UserForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        roles={roles}
        onSaved={() => void reload()}
      />

      <ResetPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
      />

      <AppConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('system.user.deleteTitle')}
        description={t('system.user.deleteConfirm', { username: deleting?.username ?? '' })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
