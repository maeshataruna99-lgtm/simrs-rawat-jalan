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
