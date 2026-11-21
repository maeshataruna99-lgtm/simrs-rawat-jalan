/**
 * Inisialisasi i18n dengan dukungan bahasa Indonesia (`id`) dan bahasa Inggris (`en`).
 * Pilihan bahasa disimpan di localStorage (`simrs_lang`) agar tetap bertahan saat reload.
 *
 * Dipakai di: main.tsx (diimpor sekali), components/AppLocaleToggle.tsx, tests/setup.ts.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import id from '@/locales/id.json';

export const LOCALE_STORAGE_KEY = 'simrs_lang';
export type SupportedLocale = 'id' | 'en';

function readInitialLocale(): SupportedLocale {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'en' || saved === 'id') {
      return saved;
    }
  } catch {
    // Abaikan bila localStorage tidak tersedia.
  }
  return 'id';
}

const initialLocale = readInitialLocale();

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: initialLocale,
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
});

/**
 * Mengubah bahasa aktif aplikasi, menyimpannya ke localStorage, dan memperbarui atribut lang HTML.
 *
 * Dipakai di: components/AppLocaleToggle.tsx, tests/i18n.test.tsx.
 */
export async function setAppLocale(locale: SupportedLocale): Promise<void> {
  await i18n.changeLanguage(locale);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Abaikan kegagalan penyimpanan pada mode privat/sandbox.
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export default i18n;
