/**
 * Navigasi halaman daftar data server-side beserta ringkasan jumlah baris dan pilihan jumlah baris per halaman.
 *
 * Dipakai di: UserPage, RolePage, ModulePage, MenuPage, halaman master data, dan halaman transaksi.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

interface Props {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Bila diisi, tampil pilihan jumlah baris per halaman. */
  onPerPageChange?: (perPage: number) => void;
}

/**
 * Menampilkan jumlah total data, pilihan baris per halaman, dan tombol navigasi halaman sebelumnya/berikutnya.
 *
 * Dipakai di: halaman master sistem, master data, dan transaksi.
 */
export function AppPaginator({ page, perPage, total, onPageChange, onPerPageChange }: Props) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <span>{t('common.paginationSummary', { page, totalPages, total })}</span>
        {onPerPageChange && (
          <label className="flex items-center gap-2">
            {t('common.perPage')}
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('common.prevPage')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t('common.nextPage')}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
