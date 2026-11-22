<?php

namespace app\modules\master\obat;

use app\common\ActiveRecord;
use app\common\CrudService;
use app\common\ValidationException;
use Yii;

/**
 * Pengelolaan master obat dan penyesuaian stok manual.
 * Stok tidak bisa diubah melalui create/update CRUD biasa, melainkan hanya lewat sesuaikanStok().
 *
 * Dipakai di: ObatController.
 */
class ObatService extends CrudService
{
    protected function modelClass(): string
    {
        return Obat::class;
    }

    protected function searchClass(): string
    {
        return ObatSearch::class;
    }

    /**
     * Membuat master obat baru dengan stok awal selalu 0.
     *
     * Dipakai di: ObatController::actionCreate().
     */
    public function create(array $data): ActiveRecord
    {
        unset($data['stok']);

        return parent::create($data);
    }

    /**
     * Memperbarui data obat tanpa menyentuh kolom stok.
     *
     * Dipakai di: ObatController::actionUpdate().
     */
    public function update(int $id, array $data): ActiveRecord
    {
        unset($data['stok']);

        return parent::update($id, $data);
    }

    /**
     * Menyesuaikan stok obat secara manual dan mencatat riwayatnya di t_stok_mutasi sebagai `penyesuaian`.
     * Menerima `stok_baru` (angka stok akhir >= 0) atau `qty` (selisih perubahan stok, positif atau negatif).
     *
     * @throws ValidationException
     *
     * Dipakai di: ObatController::actionSesuaikanStok().
     */
    public function sesuaikanStok(int $id, array $data): Obat
    {
        /** @var Obat $obat */
        $obat = $this->find($id);
        $referensi = trim((string) ($data['referensi'] ?? 'Penyesuaian stok manual'));
        if ($referensi === '') {
            $referensi = 'Penyesuaian stok manual';
        }

        $hasStokBaru = array_key_exists('stok_baru', $data) && $data['stok_baru'] !== null && $data['stok_baru'] !== '';
        $hasQty = array_key_exists('qty', $data) && $data['qty'] !== null && $data['qty'] !== '';

        if (!$hasStokBaru && !$hasQty) {
            throw new ValidationException(['qty' => ['Jumlah perubahan stok atau stok baru wajib diisi.']]);
        }

        if ($hasStokBaru && filter_var($data['stok_baru'], FILTER_VALIDATE_INT) === false) {
            throw new ValidationException(['stok_baru' => ['Stok baru harus berupa bilangan bulat.']]);
        }
        if ($hasQty && filter_var($data['qty'], FILTER_VALIDATE_INT) === false) {
            throw new ValidationException(['qty' => ['Jumlah perubahan harus berupa bilangan bulat.']]);
        }

        Yii::$app->db->transaction(function () use ($obat, $data, $hasStokBaru, $referensi) {
            $db = Yii::$app->db;
            $stokSebelum = (int) $db->createCommand(
                'SELECT stok FROM m_obat WHERE id = :id FOR UPDATE',
                [':id' => $obat->id]
            )->queryScalar();

            if ($hasStokBaru) {
                $stokSesudah = (int) $data['stok_baru'];
                $qty = $stokSesudah - $stokSebelum;
            } else {
                $qty = (int) $data['qty'];
                $stokSesudah = $stokSebelum + $qty;
            }

            if ($stokSesudah < 0) {
                throw new ValidationException([$hasStokBaru ? 'stok_baru' : 'qty' => ['Stok obat tidak boleh kurang dari 0.']]);
            }

            $userId = Yii::$app->has('user') ? Yii::$app->user->id : null;

            $db->createCommand(
                'UPDATE m_obat SET stok = :stok, updated_at = CURRENT_TIMESTAMP, updated_by = :user WHERE id = :id',
                [':stok' => $stokSesudah, ':user' => $userId, ':id' => $obat->id]
            )->execute();

            $db->createCommand()->insert('t_stok_mutasi', [
                'obat_id' => $obat->id,
                'jenis' => 'penyesuaian',
                'qty' => $qty,
                'stok_sebelum' => $stokSebelum,
                'stok_sesudah' => $stokSesudah,
                'referensi' => $referensi,
                'created_by' => $userId,
            ])->execute();
        });

        $obat->refresh();

        return $obat;
    }

    /**
     * Mengambil riwayat mutasi stok untuk satu obat, diurutkan dari yang terbaru.
     *
     * @return array<int, array<string, mixed>>
     *
     * Dipakai di: ObatController::actionMutasi().
     */
    public function listMutasi(int $id): array
    {
        $this->find($id);

        $rows = StokMutasi::find()
            ->where(['obat_id' => $id])
            ->orderBy(['id' => SORT_DESC])
            ->all();

        return array_map(fn (StokMutasi $row) => $row->toArray(), $rows);
    }

    protected function beforeDelete(ActiveRecord $model): void
    {
        $this->assertNotUsed(
            't_resep_detail',
            ['and', ['obat_id' => $model->id], ['resep_id' => (new \yii\db\Query())->select('id')->from('t_resep')->where(['status' => ['baru', 'diproses']])]],
            'Obat masih dipakai pada resep yang belum diserahkan.'
        );
    }
}
