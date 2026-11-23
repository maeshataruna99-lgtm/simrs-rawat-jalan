<?php

namespace app\tests\unit\common;

use app\common\SequenceService;
use app\tests\TestCase;
use Yii;

/**
 * Uji SequenceService pada jalur baris baru (cold start), baris sudah ada (hot path), dan floor.
 */
class SequenceServiceTest extends TestCase
{
    public function testNextMembuatBarisBaruLaluMenaikkanCounterSecaraBerurutan(): void
    {
        $kode = 'UJI_SEQ';
        $periode = '20261123';

        $hasil = Yii::$app->db->transaction(function () use ($kode, $periode) {
            return [
                SequenceService::next($kode, $periode),
                SequenceService::next($kode, $periode),
                SequenceService::next($kode, $periode, 10),
                SequenceService::next($kode, $periode),
            ];
        });

        $this->assertSame([1, 2, 11, 12], $hasil);

        $terakhir = (int) Yii::$app->db->createCommand(
            'SELECT nilai_terakhir FROM t_sequence_counter WHERE kode = :kode AND periode = :periode',
            [':kode' => $kode, ':periode' => $periode]
        )->queryScalar();
        $this->assertSame(12, $terakhir);
    }

    public function testNextFormattedMenghasilkanNomorDenganPadding(): void
    {
        $kode = Yii::$app->db->transaction(
            fn () => SequenceService::nextFormatted('UJI_FMT', 'ALL', 'TST', 5)
        );

        $this->assertSame('TST00001', $kode);
    }
}
