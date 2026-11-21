/**
 * Pencarian menu global berbasis Command Palette yang dipicu via tombol header atau pintasan Ctrl+K / Cmd+K.
 * Hanya menampilkan menu yang diizinkan pada profil pengguna login.
 *
 * Dipakai di: components/layout/AppHeader.tsx.
 */
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { AppIcon } from '@/components/AppIcon';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/auth-store';
import { flattenModuleMenus, type FlatMenuEntry } from '@/lib/menu';

/**
 * Merender tombol pencarian menu beserta CommandDialog yang terikat pintasan Ctrl+K / Cmd+K.
 *
 * Dipakai di: components/layout/AppHeader.tsx.
 */
export function AppCommandSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const modules = useAuthStore((s) => s.user?.modules ?? []);
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const flat = flattenModuleMenus(modules);
    const map = new Map<string, { nama: string; items: FlatMenuEntry[] }>();
    for (const entry of flat) {
      const group = map.get(entry.moduleKode) ?? { nama: entry.moduleNama, items: [] };
      group.items.push(entry);
      map.set(entry.moduleKode, group);
    }
    return Array.from(map.entries());
  }, [modules]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    void navigate(path);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t('layout.searchMenu')}
        className="h-9 gap-2 px-2.5 text-muted-foreground sm:w-52 sm:justify-between"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          <span className="hidden text-xs sm:inline">{t('layout.searchMenu')}</span>
        </span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">{t('layout.searchMenu')}</DialogTitle>
        <DialogDescription className="sr-only">{t('layout.searchPlaceholder')}</DialogDescription>
        <CommandInput placeholder={t('layout.searchPlaceholder')} />
        <CommandList>
          <CommandEmpty>{t('layout.searchEmpty')}</CommandEmpty>
          {grouped.map(([modKode, group]) => (
            <CommandGroup key={modKode} heading={group.nama}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.kode}
                  value={`${group.nama} ${item.nama} ${item.path}`}
                  onSelect={() => handleSelect(item.path)}
                >
                  <AppIcon icon={item.icon} className="mr-2 size-4" />
                  <span className="flex-1">{item.nama}</span>
                  <span className="font-mono text-xs text-muted-foreground">{item.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
