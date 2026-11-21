/**
 * Tabel data bersama berbasis komponen Table shadcn/ui.
 * Menyediakan pengurutan kolom, status muat, baris kosong, dan kolom aksi sesuai izin.
 *
 * Dipakai di: UserPage, RolePage, ModulePage, MenuPage, dan halaman master data.
 */
import { ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppEmptyState } from '@/components/AppEmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface AppColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  sortValue?: (row: T) => string | number | null | undefined;
}

interface Props<T> {
  columns: AppColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyText?: string;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
}

/**
 * Merender tabel data dengan kolom aksi (Ubah, Hapus, dan aksi tambahan) sesuai izin pengguna.
 *
 * Dipakai di: halaman master sistem dan master data.
 */
export function AppDataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyText,
  canUpdate = false,
  canDelete = false,
  onEdit,
  onDelete,
  extraActions,
}: Props<T>) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const showEdit = canUpdate && Boolean(onEdit);
  const showDelete = canDelete && Boolean(onDelete);
  const showActions = showEdit || showDelete || Boolean(extraActions);

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const va = col.sortValue?.(a) ?? '';
      const vb = col.sortValue?.(b) ?? '';
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'id');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [columns, rows, sortDir, sortKey]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.sortValue ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                  >
                    {col.header}
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
            {showActions && (
              <TableHead className="w-40 text-right">{t('common.actions')}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <TableRow key={idx}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
                {showActions && (
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-16" />
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : sortedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (showActions ? 1 : 0)} className="p-0">
                <AppEmptyState title={emptyText ?? t('common.emptyData')} compact />
              </TableCell>
            </TableRow>
          ) : (
            sortedRows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {extraActions?.(row)}
                      {showEdit && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(row)}
                          aria-label={t('common.edit')}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          {t('common.edit')}
                        </Button>
                      )}
                      {showDelete && onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(row)}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {t('common.delete')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
