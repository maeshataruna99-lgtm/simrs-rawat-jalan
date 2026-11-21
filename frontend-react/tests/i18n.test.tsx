/**
 * Uji dukungan multi-bahasa (id dan en): kesetaraan kunci kamus, placeholder interpolasi,
 * serta pengalih bahasa AppLocaleToggle dan persistensi localStorage.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import { AppLocaleToggle } from '@/components/AppLocaleToggle';
import { LOCALE_STORAGE_KEY, setAppLocale } from '@/lib/i18n';
import en from '@/locales/en.json';
import id from '@/locales/id.json';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

function extractPlaceholders(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
}

function SampleTranslatedView() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('auth.submit')}</p>
      <AppLocaleToggle />
    </div>
  );
}

describe('i18n (id & en)', () => {
  afterEach(async () => {
    await setAppLocale('id');
    window.localStorage.removeItem(LOCALE_STORAGE_KEY);
  });

  it('kamus en.json memiliki seluruh kunci dan placeholder yang identik dengan id.json', () => {
    const idMap = flattenKeys(id as Record<string, unknown>);
    const enMap = flattenKeys(en as Record<string, unknown>);

    const idKeys = Object.keys(idMap).sort();
    const enKeys = Object.keys(enMap).sort();

    expect(enKeys).toEqual(idKeys);

    for (const key of idKeys) {
      expect(enMap[key].trim().length, `terjemahan kosong pada kunci ${key}`).toBeGreaterThan(0);
      expect(extractPlaceholders(enMap[key]), `placeholder tidak cocok pada kunci ${key}`).toEqual(
        extractPlaceholders(idMap[key]),
      );
    }
  });

  it('AppLocaleToggle mengubah bahasa antarmuka ke Inggris lalu kembali ke Indonesia', async () => {
    render(<SampleTranslatedView />);

    expect(screen.getByText('Dashboard & Laporan')).toBeInTheDocument();
    expect(screen.getByText('Masuk')).toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: 'Ganti bahasa ke Inggris' });
    await userEvent.click(toggle);

    expect(await screen.findByText('Dashboard & Reports')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');

    await userEvent.click(screen.getByRole('button', { name: 'Switch language to Indonesian' }));
    expect(await screen.findByText('Dashboard & Laporan')).toBeInTheDocument();
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('id');
  });
});
