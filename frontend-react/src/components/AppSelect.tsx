/**
 * Combobox pemilihan data dengan pencarian lokal atau pencarian ke API berbasis Popover shadcn/ui.
 *
 * Dipakai di: halaman master jadwal praktik, tindakan, dan form transaksi (pendaftaran, pemeriksaan, resep, lab).
 */
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface AppSelectOption {
  value: string | number;
  label: string;
  description?: string;
}

interface Props {
  id?: string;
  ariaLabel?: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  options?: AppSelectOption[];
  onSearch?: (query: string) => Promise<AppSelectOption[]>;
  placeholder?: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
}

/**
 * Menampilkan tombol combobox dengan kotak pencarian dan daftar pilihan.
 * Bila `onSearch` diberikan, pencarian dijalankan ke API setiap kata kunci berubah.
 *
 * Dipakai di: JadwalDokterForm, TindakanForm, dan halaman transaksi.
 */
export function AppSelect({
  id,
  ariaLabel,
  value,
  onChange,
  options = [],
  onSearch,
  placeholder,
  searchPlaceholder,
  allowClear = false,
  clearLabel,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteOptions, setRemoteOptions] = useState<AppSelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!onSearch || !open) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      try {
        const res = await onSearch(query);
        if (active) setRemoteOptions(res);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [onSearch, open, query]);

  const sourceOptions = onSearch
    ? remoteOptions.length > 0 || query
      ? remoteOptions
      : options
    : options;
  const visibleOptions = onSearch
    ? sourceOptions
    : sourceOptions.filter((opt) =>
        `${opt.label} ${opt.description ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      );

  const selectedStr =
    value !== null && value !== undefined && value !== '' && value !== 0 ? String(value) : '';
  const selectedOption =
    options.find((o) => String(o.value) === selectedStr) ??
    remoteOptions.find((o) => String(o.value) === selectedStr);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery('');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder ?? t('common.chooseOption')}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : (placeholder ?? t('common.chooseOption'))}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
              aria-label={searchPlaceholder ?? t('common.searchPlaceholder')}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  handleOpenChange(false);
                }}
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
              >
                {clearLabel ?? t('common.all')}
              </button>
            )}
            {loading ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {t('common.loading')}
              </p>
            ) : visibleOptions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {t('common.emptyData')}
              </p>
            ) : (
              visibleOptions.map((opt) => {
                const isSelected = String(opt.value) === selectedStr;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(String(opt.value));
                      handleOpenChange(false);
                    }}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                      )}
                    </div>
                    <Check className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
