<?php

namespace app\modules\transaction\tindakan;

use app\common\ValidationException;
use app\modules\master\tindakan\Tindakan;
use app\modules\transaction\pemeriksaan\PemeriksaanService;
use app\modules\transaction\pendaftaran\Kunjungan;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Service tindakan medis per kunjungan sebagai komponen tagihan.
 *
 * Dipakai di: TindakanController, PemeriksaanService::riwayatMedis().
 */
class TindakanKunjunganService
{
    /**
     * Daftar tindakan satu kunjungan (aktif dan batal) beserta total tindakan aktif.
     *
     * @return array{items: array<int, array<string, mixed>>, total: float}
     *
     * Dipakai di: TindakanController::actionView().
     */
    public function daftar(int $kunjunganId, ?int $dokterId): array
    {
        (new PemeriksaanService())->kunjunganMilik($kunjunganId, $dokterId);
        $items = $this->itemsPerKunjungan([$kunjunganId], false)[$kunjunganId] ?? [];
        $total = array_sum(array_map(
            fn (array $i) => $i['status'] === TindakanKunjungan::STATUS_AKTIF ? $i['subtotal'] : 0,
            $items
        ));

        return ['items' => $items, 'total' => (float) $total];
    }

    /**
     * Menambahkan satu tindakan ke kunjungan. Tarif disalin dari master saat ini (snapshot).
     *
     * @param array<string, mixed> $data tindakan_id dan qty (bawaan 1).
     *
     * @throws ValidationException Bila tindakan tidak ditemukan/nonaktif atau qty tidak valid.
     * @throws ConflictHttpException Bila kunjungan sudah selesai atau batal.
     *
     * Dipakai di: TindakanController::actionCreate().
     */
    public function tambah(int $kunjunganId, array $data, ?int $dokterId): TindakanKunjungan
    {
        $kunjungan = $this->kunjunganTerbuka($kunjunganId, $dokterId);

        $tindakanId = filter_var($data['tindakan_id'] ?? null, FILTER_VALIDATE_INT);
        $qty = filter_var($data['qty'] ?? 1, FILTER_VALIDATE_INT);
        $errors = [];
        if ($qty === false || $qty < 1 || $qty > 1000) {
            $errors['qty'] = ['Jumlah harus bilangan bulat 1 sampai 1000.'];
        }
        $tindakan = $tindakanId === false ? null
            : Tindakan::findActive()->andWhere(['id' => $tindakanId, 'is_active' => true])->one();
        if ($tindakan === null) {
            $errors['tindakan_id'] = ['Tindakan tidak ditemukan atau nonaktif.'];
        }
        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        $item = new TindakanKunjungan([
            'kunjungan_id' => $kunjungan->id,
            'tindakan_id' => $tindakan->id,
            'qty' => $qty,
            'tarif' => $tindakan->tarif,
            'subtotal' => round((float) $tindakan->tarif * $qty, 2),
            'dokter_id' => $kunjungan->dokter_id,
            'status' => TindakanKunjungan::STATUS_AKTIF,
        ]);
        $item->save(false);
        $item->refresh();

        return $item;
    }

    /**
     * Membatalkan tindakan (status batal, bukan hapus fisik) agar jejak komponen tagihan tetap ada.
     *
     * @throws NotFoundHttpException
     * @throws ConflictHttpException Bila tindakan sudah batal atau kunjungan sudah ditutup.
     *
     * Dipakai di: TindakanController::actionDelete().
     */
    public function batal(int $itemId, ?int $dokterId): TindakanKunjungan
    {
        $item = TindakanKunjungan::findOne($itemId);
        if ($item === null) {
            throw new NotFoundHttpException('Data tindakan tidak ditemukan.');
        }
        $this->kunjunganTerbuka($item->kunjungan_id, $dokterId);
        if ($item->status === TindakanKunjungan::STATUS_BATAL) {
            throw new ConflictHttpException('Tindakan sudah dibatalkan.');
        }

        $item->status = TindakanKunjungan::STATUS_BATAL;
        $item->save(false, ['status', 'updated_at', 'updated_by']);

        return $item;
    }

    /**
     * Tindakan per kunjungan untuk beberapa kunjungan sekaligus.
     *
     * @param int[] $kunjunganIds
     * @return array<int, array<int, array<string, mixed>>> kunjungan_id => daftar tindakan.
     *
     * Dipakai di: daftar(), PemeriksaanService::riwayatMedis().
     */
    public function itemsPerKunjungan(array $kunjunganIds, bool $hanyaAktif): array
    {
        $query = TindakanKunjungan::find()->with('tindakan')
            ->where(['kunjungan_id' => $kunjunganIds])->orderBy(['id' => SORT_ASC]);
        if ($hanyaAktif) {
            $query->andWhere(['status' => TindakanKunjungan::STATUS_AKTIF]);
        }

        $result = [];
        foreach ($query->all() as $row) {
            $result[$row->kunjungan_id][] = $row->toArray();
        }

        return $result;
    }

    /**
     * Kunjungan milik dokter yang masih menunggu atau diperiksa.
     *
     * @throws ConflictHttpException
     */
    private function kunjunganTerbuka(int $kunjunganId, ?int $dokterId): Kunjungan
    {
        $kunjungan = (new PemeriksaanService())->kunjunganMilik($kunjunganId, $dokterId);
        if (!in_array($kunjungan->status, [Kunjungan::STATUS_MENUNGGU, Kunjungan::STATUS_DIPERIKSA], true)) {
            throw new ConflictHttpException("Kunjungan berstatus {$kunjungan->status} tidak dapat diubah.");
        }

        return $kunjungan;
    }
}
