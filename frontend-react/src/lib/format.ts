/**
 * Fungsi pemformatan tampilan nominal Rupiah.
 *
 * Dipakai di: PoliPage, TindakanPage, PemeriksaanLabPage, ObatPage, BillingPage.
 */

/**
 * Memformat angka menjadi string Rupiah (contoh: Rp 25.000).
 *
 * Dipakai di: halaman master dan transaksi yang menampilkan tarif atau harga.
 */
export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}
