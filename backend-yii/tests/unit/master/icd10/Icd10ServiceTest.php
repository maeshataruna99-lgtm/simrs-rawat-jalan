<?php

namespace app\tests\unit\master\icd10;

use app\modules\master\icd10\Icd10Service;
use app\seeds\Icd10Seeder;
use app\tests\TestCase;

/**
 * Uji seeder dan pencarian master ICD-10.
 */
class Icd10ServiceTest extends TestCase
{
    public function testSeederAmanDiulangDanPencarianBerjalan(): void
    {
        $seeder = new Icd10Seeder();
        $seeder->run();
        $seeder->run();

        $service = new Icd10Service();
        $total = $service->list([])->getTotalCount();
        $this->assertGreaterThanOrEqual(20, $total);

        $byCode = $service->list(['q' => 'J06.9']);
        $this->assertSame(1, $byCode->getTotalCount());

        $byName = $service->list(['q' => 'Hipertensi']);
        $this->assertSame(1, $byName->getTotalCount());
    }
}
