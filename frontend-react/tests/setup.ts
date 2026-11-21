/**
 * Persiapan Vitest: matcher DOM, i18n, dan pembersihan DOM setelah setiap test.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@/lib/i18n';

afterEach(() => {
  cleanup();
});

// jsdom belum menyediakan matchMedia; dipakai hook use-mobile milik sidebar shadcn.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});
