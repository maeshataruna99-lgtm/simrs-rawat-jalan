<?php

namespace app\tests\unit\master\pasien;

use app\common\ValidationException;
use app\modules\master\pasien\PasienService;
use app\tests\TestCase;
use yii\web\ConflictHttpException;

/**
 * Uji master pasien: nomor RM otomatis, penolakan NIK ganda (409), dan pencarian RM/NIK/nama.
 */
class PasienServiceTest extends TestCase
{
    public function testNomorRmTerbentukBerurutan(): void
    {
        $service = new PasienService();

        $p1 = $service->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Merdeka 1',
            'no_hp' => '081234567890',
        ]);
        $p2 = $service->create([
            'nik' => '3201010101920002',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-05-10',
            'jenis_kelamin' => 'P',
        ]);

        $this->assertSame('RM000001', $p1->no_rm);
        $this->assertSame('RM000002', $p2->no_rm);
    }

    public function testNikGandaDitolak409(): void
    {
        $service = new PasienService();
        $service->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);

        $this->expectException(ConflictHttpException::class);
        $service->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Duplikat',
            'tgl_lahir' => '1991-02-02',
            'jenis_kelamin' => 'L',
        ]);
    }

    public function testFormatNikTidakValidDitolak422(): void
    {
        $this->expectException(ValidationException::class);
        (new PasienService())->create([
            'nik' => '12345',
            'nama' => 'Salah NIK',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
    }

    public function testPencarianBerdasarkanRmNikAtauNama(): void
    {
        $service = new PasienService();
        $p1 = $service->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $service->create([
            'nik' => '3201010101920002',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-05-10',
            'jenis_kelamin' => 'P',
        ]);

        $this->assertSame(1, $service->list(['q' => $p1->no_rm])->getTotalCount());
        $this->assertSame(1, $service->list(['q' => '3201010101920002'])->getTotalCount());
        $this->assertSame(1, $service->list(['q' => 'Santoso'])->getTotalCount());
    }
}
