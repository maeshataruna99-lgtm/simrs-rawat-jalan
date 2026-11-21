<?php

namespace app\tests\unit\seeds;

use app\seeds\DummySeeder;
use app\tests\TestCase;
use yii\db\Query;

/**
 * Uji seeder data dummy end-to-end beserta sifat idempotennya (poin 10.2).
 */
class DummySeederTest extends TestCase
{
    public function testDummySeederMengisiDataBermaknaDanIdempoten(): void
    {
        $seeder = new DummySeeder();
        $seeder->run();
        $seeder->run();

        $this->assertSame(4, (int) (new Query())->from('m_poli')->where(['deleted_at' => null])->count());
        $this->assertSame(5, (int) (new Query())->from('m_dokter')->where(['deleted_at' => null])->count());
        $this->assertSame(50, (int) (new Query())->from('m_pasien')->where(['deleted_at' => null])->count());
        $this->assertSame(35, (int) (new Query())->from('m_jadwal_dokter')->where(['deleted_at' => null])->count());
        $this->assertSame(60, (int) (new Query())->from('t_kunjungan')->count());
        $this->assertSame(59, (int) (new Query())->from('t_invoice')->count());
        $this->assertGreaterThan(40, (int) (new Query())->from('t_pembayaran')->count());
    }
}
