/**
 * Aturan lint React + TypeScript. Format kode diserahkan ke Prettier.
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  prettier,
  {
    languageOptions: { globals: globals.browser },
  },
  {
    // Komponen shadcn/ui disalin apa adanya dari registry agar mudah diperbarui.
    // Polanya (ekspor variant, Math.random di skeleton, setState di effect) memang bawaan library.
    files: ['src/components/ui/**', 'src/hooks/use-mobile.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
);
