/**
 * Aturan validasi pesan commit (Conventional Commits).
 * Dijalankan otomatis oleh hook husky `.husky/commit-msg`. Detail aturan ada di CONTRIBUTING.md bagian 4.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
  },
};
