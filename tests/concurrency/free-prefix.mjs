/**
 * Mencari huruf prefix antrean (A-Z) yang belum dipakai poli aktif, karena prefix_antrean wajib dan unik.
 *
 * Dipakai di: pendaftaran.mjs, stok-obat.mjs, pembayaran.mjs.
 */
export async function freePrefix(api, token) {
  const res = await api('GET', '/master/poli?per_page=100', null, token);
  const used = new Set((res.body.data ?? []).map((p) => p.prefix_antrean));
  const free = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((c) => !used.has(c));
  if (!free) throw new Error('Semua prefix antrean A-Z sudah dipakai; hapus poli uji lama terlebih dahulu.');
  return free;
}
