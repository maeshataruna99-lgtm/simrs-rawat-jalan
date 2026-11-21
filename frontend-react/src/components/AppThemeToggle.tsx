/**
 * Tombol untuk berganti tema terang dan gelap. Pilihan disimpan oleh ThemeProvider.
 *
 * Dipakai di: pages/UiKitPage.tsx, header layout (poin 1.11).
 */
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';

export function AppThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t('theme.toggle')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
