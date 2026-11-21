/**
 * Hook pengelolaan daftar data CRUD berhalaman: muat daftar, filter/pencarian, dan pindah halaman.
 *
 * Dipakai di: halaman master sistem (UserPage, RolePage, ModulePage, MenuPage) dan master data.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/lib/api-client';

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PageMeta;
}

/**
 * Mengelola state daftar berhalaman beserta filter dan pemuatan ulang dari API.
 *
 * Dipakai di: UserPage, RolePage, ModulePage, MenuPage.
 */
export function useCrud<TItem, TFilter extends Record<string, unknown>>(
  fetcher: (
    params: TFilter & { page: number; per_page: number },
  ) => Promise<PaginatedResult<TItem>>,
  initialFilter: TFilter,
  perPage = 20,
) {
  const { t } = useTranslation();

  const [filter, setFilter] = useState<TFilter>(initialFilter);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filter);

  const reload = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const currentFilter = JSON.parse(filterKey) as TFilter;
      const result = await fetcher({
        ...currentFilter,
        page,
        per_page: perPage,
      });
      setItems(result.items);
      setTotal(result.meta?.total ?? result.items.length);
    } catch (err) {
      setError(errorMessage(err, t('common.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [fetcher, filterKey, page, perPage, t]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await reload();
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  const updateFilter = useCallback((patch: Partial<TFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  return {
    items,
    total,
    page,
    perPage,
    filter,
    loading,
    error,
    setPage,
    updateFilter,
    reload,
  };
}
