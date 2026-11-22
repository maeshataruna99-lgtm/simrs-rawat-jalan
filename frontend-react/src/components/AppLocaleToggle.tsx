/**
 * Tombol pengalih bahasa antarmuka antara Bahasa Indonesia (ID) dan Bahasa Inggris (EN).
 *
 * Dipakai di: components/layout/AppHeader.tsx, modules/system/auth/LoginPage.tsx,
 * modules/transaction/antrean/DisplayAntreanPage.tsx.
 */
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { setAppLocale, type SupportedLocale } from '@/lib/i18n';

export function AppLocaleToggle() {
  const { t, i18n } = useTranslation();
  const current: SupportedLocale = i18n.language.startsWith('en') ? 'en' : 'id';
  const next: SupportedLocale = current === 'id' ? 'en' : 'id';

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-9 px-2.5 text-xs font-semibold"
      onClick={() => void setAppLocale(next)}
      aria-label={t('locale.switch')}
      title={t('locale.switch')}
    >
      {current.toUpperCase()}
    </Button>
  );
}
