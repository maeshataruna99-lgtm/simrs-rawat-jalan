/**
 * Baris pencarian, filter tambahan, dan tombol tambah pada halaman daftar data.
 * Tombol tambah hanya ditampilkan jika pengguna memiliki izin create (`canCreate`).
 *
 * Dipakai di: UserPage, RolePage, ModulePage, MenuPage, dan halaman master data.
 */
import { Plus, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  canCreate?: boolean;
  createLabel?: string;
  onCreate?: () => void;
  children?: ReactNode;
}

/**
 * Menampilkan input pencarian kata kunci, slot filter tambahan, dan tombol tambah data.
 *
 * Dipakai di: halaman master sistem dan master data.
 */
export function AppFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  canCreate = false,
  createLabel,
  onCreate,
  children,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
            aria-label={searchPlaceholder ?? t('common.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        {children}
      </div>
      {canCreate && onCreate && (
        <Button onClick={onCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          {createLabel ?? t('common.add')}
        </Button>
      )}
    </div>
  );
}
