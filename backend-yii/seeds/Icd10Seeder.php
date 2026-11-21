<?php

namespace app\seeds;

use Yii;
use yii\db\Query;

/**
 * Pengisi data master ICD-10 dari seeds/data/icd10.php.
 * Aman dijalankan berulang: dicocokkan berdasarkan kode pada baris aktif.
 *
 * Dipakai di: commands/SeedController.php, tests/unit/master/icd10/Icd10ServiceTest.php.
 */
class Icd10Seeder
{
    public function run(): void
    {
        $rows = require __DIR__ . '/data/icd10.php';

        Yii::$app->db->transaction(function () use ($rows) {
            foreach ($rows as $row) {
                $id = (new Query())->select('id')->from('m_icd10')
                    ->where(['kode' => $row['kode'], 'deleted_at' => null])->scalar();

                if ($id === false) {
                    Yii::$app->db->createCommand()->insert('m_icd10', $row)->execute();
                } else {
                    Yii::$app->db->createCommand()->update('m_icd10', $row, ['id' => $id])->execute();
                }
            }
        });
    }
}
