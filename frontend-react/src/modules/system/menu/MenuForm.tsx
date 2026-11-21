/**
 * Dialog form tambah dan ubah master menu.
 *
 * Dipakai di: MenuPage.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppFormDialog } from '@/components/AppFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import type { ModuleItem } from '@/modules/system/module/module.types';
import * as menuApi from './menu.api';
import type { SystemMenuItem } from './menu.types';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const schema = z.object({
  kode: z
    .string()
    .trim()
    .min(1, 'system.menu.kodeRequired')
    .regex(/^[a-z0-9-]+$/, 'system.common.kodePattern'),
  nama: z.string().trim().min(1, 'system.menu.namaRequired'),
  module_id: z.number().int().min(1, 'system.menu.moduleRequired'),
  parent_id: z.string().optional(),
  path: z.string().trim().optional(),
  icon: z.string().trim().optional(),
  urutan: z.number().int().min(0, 'system.common.urutanMin'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SystemMenuItem | null;
  modules: ModuleItem[];
  allMenus: SystemMenuItem[];
  onSaved: () => void;
}

/**
 * Menampilkan form dialog untuk membuat atau memperbarui data menu.
 *
 * Dipakai di: MenuPage.
 */
export function MenuForm({ open, onOpenChange, editing, modules, allMenus, onSaved }: Props) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          kode: editing.kode,
          nama: editing.nama,
          module_id: editing.module_id ?? 0,
          parent_id: editing.parent_id ? String(editing.parent_id) : '',
          path: editing.path ?? '',
          icon: editing.icon ?? '',
          urutan: editing.urutan,
          is_active: editing.is_active,
        }
      : {
          kode: '',
          nama: '',
          module_id: modules[0]?.id ?? 0,
          parent_id: '',
          path: '',
          icon: '',
          urutan: 0,
          is_active: true,
        },
  });

  const watchedModuleId = useWatch({ control, name: 'module_id' });
  const selectedModuleId = Number(watchedModuleId);
  const parentCandidates = allMenus.filter(
    (m) => m.module_id === selectedModuleId && (!editing || m.id !== editing.id),
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setServerError(null);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const payload = {
        kode: values.kode,
        nama: values.nama,
        module_id: values.module_id,
        parent_id: values.parent_id ? Number(values.parent_id) : null,
        path: values.path || null,
        icon: values.icon || null,
        urutan: values.urutan,
        is_active: values.is_active,
      };
      if (editing) {
        await menuApi.updateMenu(editing.id, payload);
      } else {
        await menuApi.createMenu(payload);
      }
      toast.success(t('common.saveSuccess'));
      handleOpenChange(false);
      onSaved();
    } catch (err) {
      const fields = fieldErrors(err);
      const keys = Object.keys(fields) as (keyof FormValues)[];
      keys.forEach((key) => {
        if (fields[key]?.[0]) {
          setError(key, { message: fields[key][0] });
        }
      });
      if (keys.length === 0) {
        setServerError(errorMessage(err, t('common.saveFailed')));
      }
    }
  };

  return (
    <AppFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={editing ? t('system.menu.editTitle') : t('system.menu.addTitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="menu-kode">{t('system.common.kode')}</Label>
            <Input id="menu-kode" {...register('kode')} />
            {errors.kode && (
              <p className="text-sm text-destructive">
                {t(errors.kode.message ?? '', { defaultValue: errors.kode.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-nama">{t('system.common.nama')}</Label>
            <Input id="menu-nama" {...register('nama')} />
            {errors.nama && (
              <p className="text-sm text-destructive">
                {t(errors.nama.message ?? '', { defaultValue: errors.nama.message })}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="menu-module">{t('system.menu.module')}</Label>
            <select
              id="menu-module"
              className={selectClassName}
              {...register('module_id', { valueAsNumber: true })}
            >
              <option value={0}>{t('system.menu.chooseModule')}</option>
              {modules.map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.nama}
                </option>
              ))}
            </select>
            {errors.module_id && (
              <p className="text-sm text-destructive">
                {t(errors.module_id.message ?? '', { defaultValue: errors.module_id.message })}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-parent">{t('system.menu.parent')}</Label>
            <select id="menu-parent" className={selectClassName} {...register('parent_id')}>
              <option value="">{t('system.menu.noParent')}</option>
              {parentCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
            {errors.parent_id && (
              <p className="text-sm text-destructive">
                {t(errors.parent_id.message ?? '', { defaultValue: errors.parent_id.message })}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="menu-path">{t('system.menu.path')}</Label>
          <Input id="menu-path" {...register('path')} placeholder="/master/pasien" />
          {errors.path && (
            <p className="text-sm text-destructive">
              {t(errors.path.message ?? '', { defaultValue: errors.path.message })}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="menu-icon">{t('system.common.icon')}</Label>
            <Input id="menu-icon" {...register('icon')} placeholder="menu" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-urutan">{t('system.common.urutan')}</Label>
            <Input
              id="menu-urutan"
              type="number"
              min={0}
              {...register('urutan', { valueAsNumber: true })}
            />
            {errors.urutan && (
              <p className="text-sm text-destructive">
                {t(errors.urutan.message ?? '', { defaultValue: errors.urutan.message })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <Switch id="menu-active" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label htmlFor="menu-active">{t('system.common.active')}</Label>
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </AppFormDialog>
  );
}
