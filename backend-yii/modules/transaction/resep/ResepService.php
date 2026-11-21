<?php

namespace app\modules\transaction\resep;

use app\common\SequenceService;
use app\common\ValidationException;
use app\modules\master\obat\Obat;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use Yii;
use yii\web\ConflictHttpException;

/**
 * Service resep obat: pembuatan resep oleh dokter dengan validasi ketersediaan stok.
 *
 * Dipakai di: ResepController.
 */
class ResepService
{
    /**
     * Daftar resep satu kunjungan, terbaru dulu.
     *
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: ResepController::actionIndex().
     */
    public function daftarPerKunjungan(int $kunjunganId, ?int $dokterId): array
    {
        (new PemeriksaanService())->kunjunganMilik($kunjunganId, $dokterId);
        $rows = Resep::find()->with(['details.obat', 'dokter', 'kunjungan.pasien', 'kunjungan.poli'])
            ->where(['kunjungan_id' => $kunjunganId])->orderBy(['id' => SORT_DESC])->all();

        return array_map(fn (Resep $r) => $r->toArray(), $rows);
    }

    /**
     * Membuat resep untuk kunjungan yang masih menunggu/diperiksa. Harga obat disalin (snapshot).
     * Stok belum dikurangi; pengurangan terjadi saat obat diserahkan farmasi.
     *
     * @param array<string, mixed> $data kunjungan_id, catatan, items[{obat_id, dosis, frekuensi, jumlah}].
     *
     * @throws ValidationException Bila isian tidak valid atau jumlah melebihi stok (pesan menyebut nama obat).
     * @throws ConflictHttpException Bila kunjungan sudah selesai atau batal.
     *
     * Dipakai di: ResepController::actionCreate().
     */
    public function buat(array $data, ?int $dokterId): Resep
    {
        $kunjunganId = filter_var($data['kunjungan_id'] ?? null, FILTER_VALIDATE_INT);
        if ($kunjunganId === false) {
            throw new ValidationException(['kunjungan_id' => ['Kunjungan wajib dipilih.']]);
        }
        $kunjungan = (new PemeriksaanService())->kunjunganMilik($kunjunganId, $dokterId);
        if (!in_array($kunjungan->status, [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA], true)) {
            throw new ConflictHttpException("Kunjungan berstatus {$kunjungan->status} tidak dapat diberi resep.");
        }

        $items = is_array($data['items'] ?? null) ? array_values($data['items']) : [];
        if ($items === []) {
            throw new ValidationException(['items' => ['Resep minimal berisi satu obat.']]);
        }

        $rows = [];
        $errors = [];
        foreach ($items as $i => $item) {
            $item = is_array($item) ? $item : [];
            $obatId = filter_var($item['obat_id'] ?? null, FILTER_VALIDATE_INT);
            $jumlah = filter_var($item['jumlah'] ?? null, FILTER_VALIDATE_INT);
            $dosis = trim((string) ($item['dosis'] ?? ''));
            $frekuensi = trim((string) ($item['frekuensi'] ?? ''));
            if ($obatId === false || $jumlah === false || $jumlah < 1 || $dosis === '' || $frekuensi === '') {
                $errors["items.{$i}"] = ['Obat, dosis, frekuensi, dan jumlah (minimal 1) wajib diisi.'];
                continue;
            }
            if (isset($rows[$obatId])) {
                $errors["items.{$i}"] = ['Obat yang sama tidak boleh dipilih dua kali dalam satu resep.'];
                continue;
            }
            $rows[$obatId] = ['jumlah' => $jumlah, 'dosis' => mb_substr($dosis, 0, 50), 'frekuensi' => mb_substr($frekuensi, 0, 50), 'index' => $i];
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $obatList = Obat::findActive()->andWhere(['id' => array_keys($rows), 'is_active' => true])->indexBy('id')->all();
        foreach ($rows as $obatId => $row) {
            $obat = $obatList[$obatId] ?? null;
            if ($obat === null) {
                $errors["items.{$row['index']}"] = ['Obat tidak ditemukan atau nonaktif.'];
            } elseif ($row['jumlah'] > (int) $obat->stok) {
                $errors["items.{$row['index']}"] = ["Stok {$obat->nama} tidak cukup (tersedia {$obat->stok} {$obat->satuan})."];
            }
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        /** @var Resep $resep */
        $resep = Yii::$app->db->transaction(function () use ($kunjungan, $rows, $obatList, $data) {
            $ymd = date('Ymd');
            $resep = new Resep([
                'no_resep' => SequenceService::nextFormatted('RESEP', $ymd, "RSP{$ymd}", 4),
                'kunjungan_id' => $kunjungan->id,
                'dokter_id' => $kunjungan->dokter_id,
                'status' => Resep::STATUS_BARU,
                'catatan' => trim((string) ($data['catatan'] ?? '')) ?: null,
            ]);
            $resep->save(false);
            foreach ($rows as $obatId => $row) {
                $harga = (float) $obatList[$obatId]->harga;
                (new ResepDetail([
                    'resep_id' => $resep->id,
                    'obat_id' => $obatId,
                    'dosis' => $row['dosis'],
                    'frekuensi' => $row['frekuensi'],
                    'jumlah' => $row['jumlah'],
                    'harga' => $harga,
                    'subtotal' => round($harga * $row['jumlah'], 2),
                ]))->save(false);
            }

            return $resep;
        });

        return Resep::find()->with(['details.obat', 'dokter', 'kunjungan.pasien', 'kunjungan.poli'])
            ->where(['id' => $resep->id])->one();
    }
}
