/**
 * Filter sisi klien: true bila salah satu teks memuat kata kunci (tanpa membedakan huruf besar kecil).
 *
 * Dipakai di: FarmasiPage, LaboratoriumPage, WorklistPage.
 */
export function matchesQuery(q: string, ...texts: (string | null | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  return needle === '' || texts.some((s) => (s ?? '').toLowerCase().includes(needle));
}
