/**
 * Inisialisasi i18n. Saat ini hanya bahasa Indonesia; bahasa lain cukup menambah file di src/locales.
 *
 * Dipakai di: main.tsx (diimpor sekali), tests/setup.ts.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from '@/locales/id.json';

i18n.use(initReactI18next).init({
  resources: { id: { translation: id } },
  lng: 'id',
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
});

export default i18n;
