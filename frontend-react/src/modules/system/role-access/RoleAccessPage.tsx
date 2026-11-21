/**
 * Halaman matriks hak akses role (/system/role-access).
 * Memilih role, menampilkan tabel centang (modul -> menu x baca/tambah/ubah/hapus),
 * menyimpan perubahan ke PUT /system/role-access/{roleId}, dan menampilkan pesan 422 dari server.
 *
 * Dipakai di: routes/index.tsx.
 */
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import * as roleApi from '@/modules/system/role/role.api';
import type { RoleItem } from '@/modules/system/role/role.types';
import * as roleAccessApi from './role-access.api';
import type { RoleAccessItemPayload, RoleAccessMatrix } from './role-access.types';

const MENU = 'system-role-access';

type ActionFlag = 'can_read' | 'can_create' | 'can_update' | 'can_delete';

const selectClassName =
  'flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function RoleAccessPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);
  const canUpdate = can(MENU, 'update');

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [matrix, setMatrix] = useState<RoleAccessMatrix | null>(null);
  const [flags, setFlags] = useState<Record<number, Record<ActionFlag, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const applyMatrix = useCallback((data: RoleAccessMatrix) => {
    setMatrix(data);
    const next: Record<number, Record<ActionFlag, boolean>> = {};
    data.modules.forEach((mod) => {
      mod.menus.forEach((m) => {
        next[m.id] = {
          can_read: m.can_read,
          can_create: m.can_create,
          can_update: m.can_update,
          can_delete: m.can_delete,
        };
      });
    });
    setFlags(next);
  }, []);

  const loadRoleMatrix = useCallback(
    async (roleId: number) => {
      if (!roleId) return;
      await Promise.resolve();
      setLoading(true);
      setServerError(null);
      try {
        const data = await roleAccessApi.fetchRoleAccess(roleId);
        applyMatrix(data);
      } catch (err) {
        setServerError(errorMessage(err, t('common.loadFailed')));
      } finally {
        setLoading(false);
      }
    },
    [applyMatrix, t],
  );

  useEffect(() => {
    void roleApi
      .listRoles({ per_page: 100 })
      .then((res) => {
        setRoles(res.items);
        if (res.items[0]) {
          setSelectedRoleId(res.items[0].id);
          void loadRoleMatrix(res.items[0].id);
        }
      })
      .catch((err) => {
        setServerError(errorMessage(err, t('common.loadFailed')));
      });
  }, [loadRoleMatrix, t]);

  const handleRoleChange = (roleId: number) => {
    setSelectedRoleId(roleId);
    void loadRoleMatrix(roleId);
  };

  const handleToggle = (menuId: number, action: ActionFlag, checked: boolean) => {
    setFlags((prev) => {
      const current = prev[menuId] ?? {
        can_read: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      };
      const updated = { ...current, [action]: checked };
      if (action !== 'can_read' && checked) {
        updated.can_read = true;
      }
      return { ...prev, [menuId]: updated };
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setServerError(null);
    try {
      const access: RoleAccessItemPayload[] = Object.entries(flags).map(([id, itemFlags]) => ({
        menu_id: Number(id),
        ...itemFlags,
      }));
      const updated = await roleAccessApi.saveRoleAccess(selectedRoleId, access);
      applyMatrix(updated);
      toast.success(t('system.roleAccess.saveSuccess'));
    } catch (err) {
      const fields = fieldErrors(err);
      const firstFieldError = Object.values(fields).flat()[0];
      const msg = firstFieldError ?? errorMessage(err, t('common.saveFailed'));
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const actions: { key: ActionFlag; label: string }[] = [
    { key: 'can_read', label: t('system.roleAccess.read') },
    { key: 'can_create', label: t('system.roleAccess.create') },
    { key: 'can_update', label: t('system.roleAccess.update') },
    { key: 'can_delete', label: t('system.roleAccess.delete') },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('system.roleAccess.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('system.roleAccess.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label htmlFor="role-access-select">{t('system.roleAccess.selectRole')}</Label>
          <select
            id="role-access-select"
            className={selectClassName}
            value={selectedRoleId}
            onChange={(e) => handleRoleChange(Number(e.target.value))}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.nama}
              </option>
            ))}
          </select>
        </div>

        {canUpdate && (
          <Button onClick={() => void handleSave()} disabled={saving || loading || !matrix}>
            {t('common.save')}
          </Button>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('system.roleAccess.menuColumn')}</TableHead>
              {actions.map((act) => (
                <TableHead key={act.key} className="w-28 text-center">
                  {act.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!matrix || matrix.modules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {loading ? t('common.loading') : t('common.emptyData')}
                </TableCell>
              </TableRow>
            ) : (
              matrix.modules.map((mod) => (
                <Fragment key={mod.id ?? mod.nama}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={5} className="font-semibold">
                      {mod.nama}
                    </TableCell>
                  </TableRow>
                  {mod.menus.map((m) => {
                    const rowFlags = flags[m.id] ?? {
                      can_read: false,
                      can_create: false,
                      can_update: false,
                      can_delete: false,
                    };
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className={m.parent_id ? 'pl-4' : ''}>
                            <div className="font-medium">{m.nama}</div>
                            <div className="font-mono text-xs text-muted-foreground">{m.kode}</div>
                          </div>
                        </TableCell>
                        {actions.map((act) => (
                          <TableCell key={act.key} className="text-center">
                            <Checkbox
                              checked={rowFlags[act.key]}
                              disabled={!canUpdate}
                              aria-label={`${m.nama} - ${act.label}`}
                              onCheckedChange={(checked) =>
                                handleToggle(m.id, act.key, Boolean(checked))
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
