<?php

namespace app\tests\unit\transaction\pendaftaran;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;
use Yii;
use yii\db\IntegrityException;
use yii\web\ConflictHttpException;

/**
 * Uji pencarian pasien dan pendaftaran kunjungan rawat jalan (poin 3.2 dan 3.3).
 */
class PendaftaranServiceTest extends TestCase
{
    public function testCariPasienBerdasarkanRmNikDanNama(): void
    {
        $pasienService = new PasienService();
        $p1 = $pasienService->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $pasienService->create([
            'nik' => '3201010101920002',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-05-10',
            'jenis_kelamin' => 'P',
        ]);

        $service = new PendaftaranService();

        $byRm = $service->cariPasien($p1->no_rm);
        $this->assertCount(1, $byRm);
        $this->assertSame('Budi Santoso', $byRm[0]['nama']);

        $byNik = $service->cariPasien('3201010101920002');
        $this->assertCount(1, $byNik);
        $this->assertSame('Siti Aminah', $byNik[0]['nama']);

        $byNama = $service->cariPasien('Santoso');
        $this->assertCount(1, $byNama);
    }

    public function testPendaftaranSesuaiJadwalAntreanBerurutanDanKuotaPenuhDitolak(): void
    {
        $pasienService = new PasienService();
        $p1 = $pasienService->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $p2 = $pasienService->create([
            'nik' => '3201010101920002',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-05-10',
            'jenis_kelamin' => 'P',
        ]);
        $p3 = $pasienService->create([
            'nik' => '3201010101930003',
            'nama' => 'Andi Wijaya',
            'tgl_lahir' => '1993-03-03',
            'jenis_kelamin' => 'L',
        ]);

        $dokter = (new DokterService())->create([
            'kode' => 'DR001',
            'nama' => 'dr. Budi',
            'sip' => 'SIP/001',
            'jenis_tenaga' => 'dokter',
        ]);
        $poli = (new PoliService())->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 25000,
        ]);

        // Tanggal kunjungan selalu hari Senin (hari = 1), kuota = 2.
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 2,
        ]);

        $service = new PendaftaranService();

        $k1 = $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);
        $k2 = $service->daftar([
            'pasien_id' => $p2->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);

        $this->assertSame(1, $k1->no_antrean);
        $this->assertSame(2, $k2->no_antrean);

        // Pasien ke-3 pada jadwal yang kuotanya 2 harus ditolak.
        $this->expectException(ValidationException::class);
        $service->daftar([
            'pasien_id' => $p3->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);
    }

    public function testPendaftaranDiLuarHariJadwalAtauGandaDitolak(): void
    {
        $p1 = (new PasienService())->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $dokter = (new DokterService())->create([
            'kode' => 'DR001',
            'nama' => 'dr. Budi',
            'sip' => 'SIP/001',
            'jenis_tenaga' => 'dokter',
        ]);
        $poli = (new PoliService())->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 25000,
        ]);
        $jadwalSenin = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 10,
        ]);

        $service = new PendaftaranService();

        // Sehari setelahnya adalah hari Selasa (bukan Senin).
        try {
            $service->daftar([
                'pasien_id' => $p1->id,
                'jadwal_id' => $jadwalSenin->id,
                'tgl_kunjungan' => self::seninDepan(1),
            ]);
            $this->fail('Pendaftaran di luar hari jadwal seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('tgl_kunjungan', $e->errors);
        }

        // Senin lalu sesuai hari jadwal, tetapi tanggal lampau tetap ditolak.
        try {
            $service->daftar([
                'pasien_id' => $p1->id,
                'jadwal_id' => $jadwalSenin->id,
                'tgl_kunjungan' => self::seninDepan(-14),
            ]);
            $this->fail('Pendaftaran tanggal lampau seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('tgl_kunjungan', $e->errors);
        }

        // Daftar di hari Senin berhasil, daftar kedua kali di poli dan tanggal yang sama ditolak 409.
        $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwalSenin->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);

        $this->expectException(ConflictHttpException::class);
        $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwalSenin->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);
    }

    public function testConstraintDatabaseDanDaftarUlangSetelahBatal(): void
    {
        $p1 = (new PasienService())->create([
            'nik' => '3201010101900001',
            'nama' => 'Budi Santoso',
            'tgl_lahir' => '1990-01-01',
            'jenis_kelamin' => 'L',
        ]);
        $p2 = (new PasienService())->create([
            'nik' => '3201010101920002',
            'nama' => 'Siti Aminah',
            'tgl_lahir' => '1992-05-10',
            'jenis_kelamin' => 'P',
        ]);
        $dokter = (new DokterService())->create([
            'kode' => 'DR001',
            'nama' => 'dr. Budi',
            'sip' => 'SIP/001',
            'jenis_tenaga' => 'dokter',
        ]);
        $poli = (new PoliService())->create([
            'kode' => 'POLI-UMUM',
            'nama' => 'Poli Umum',
            'prefix_antrean' => 'U',
            'tarif_pendaftaran' => 25000,
        ]);
        $jadwal = (new JadwalDokterService())->create([
            'dokter_id' => $dokter->id,
            'poli_id' => $poli->id,
            'hari' => 1,
            'jam_mulai' => '08:00',
            'jam_selesai' => '12:00',
            'kuota' => 10,
        ]);

        $service = new PendaftaranService();
        $k1 = $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);

        // Setelah kunjungan dibatalkan, partial unique index mengizinkan pendaftaran ulang di tanggal yang sama.
        (new AntreanService())->ubahStatus($k1->id, 'batal');

        $k2 = $service->daftar([
            'pasien_id' => $p1->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);
        $this->assertSame(2, $k2->no_antrean);

        // Pengaman terakhir di DB: insert langsung nomor antrean yang sama pada poli+dokter+tanggal yang sama wajib ditolak.
        $this->expectException(IntegrityException::class);
        Yii::$app->db->createCommand()->insert('t_kunjungan', [
            'no_kunjungan' => 'RJ202611239999',
            'pasien_id' => $p2->id,
            'poli_id' => $poli->id,
            'dokter_id' => $dokter->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
            'no_antrean' => 2,
            'status' => 'menunggu',
        ])->execute();
    }
}
