/**
 * Navigasi halaman daftar data server-side beserta ringkasan jumlah baris.
 *
 * Dipakai di: UserPage, RolePage, ModulePage, MenuPage, dan halaman master data.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Menampilkan jumlah total data dan tombol navigasi halaman sebelumnya/berikutnya.
 *
 * Dipakai di: halaman master sistem dan master data.
 */
export function AppPaginator({ page, perPage, total, onPageChange }: Props) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 pt-2 text-sm text-muted-foreground">
      <span>{t('common.paginationSummary', { page, totalPages, total })}</span>
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
