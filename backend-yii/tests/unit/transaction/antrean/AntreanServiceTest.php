<?php

namespace app\tests\unit\transaction\antrean;

use app\common\ValidationException;
use app\modules\master\dokter\DokterService;
use app\modules\master\jadwal\JadwalDokterService;
use app\modules\master\pasien\PasienService;
use app\modules\master\poli\PoliService;
use app\modules\transaction\antrean\AntreanService;
use app\modules\transaction\pendaftaran\PendaftaranService;
use app\tests\TestCase;

/**
 * Uji daftar antrean, perubahan status antrean (beserta log), dan riwayat kunjungan pasien (poin 3.4).
 */
class AntreanServiceTest extends TestCase
{
    public function testPerubahanStatusTercatatDiLogDanTampilDiRiwayat(): void
    {
        $pasien = (new PasienService())->create([
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

        $kunjungan = (new PendaftaranService())->daftar([
            'pasien_id' => $pasien->id,
            'jadwal_id' => $jadwal->id,
            'tgl_kunjungan' => self::seninDepan(),
        ]);

        $antreanService = new AntreanService();
        $list = $antreanService->list(['poli_id' => $poli->id, 'tanggal' => self::seninDepan()]);
        $this->assertCount(1, $list);
        $this->assertSame('menunggu', $list[0]['status']);

        $updated = $antreanService->ubahStatus($kunjungan->id, 'diperiksa');
        $this->assertSame('diperiksa', $updated->status);

        $riwayat = $antreanService->riwayatPasien($pasien->id);
        $this->assertCount(1, $riwayat);
        $this->assertCount(2, $riwayat[0]['status_logs']);
        $this->assertNull($riwayat[0]['status_logs'][0]['status_lama']);
        $this->assertSame('menunggu', $riwayat[0]['status_logs'][0]['status_baru']);
        $this->assertSame('menunggu', $riwayat[0]['status_logs'][1]['status_lama']);
        $this->assertSame('diperiksa', $riwayat[0]['status_logs'][1]['status_baru']);

        // Status tidak boleh mundur, dan status akhir tidak bisa dibuka kembali.
        foreach ([['menunggu'], ['selesai', 'menunggu']] as $langkah) {
            try {
                foreach ($langkah as $status) {
                    $antreanService->ubahStatus($kunjungan->id, $status);
                }
                $this->fail('Transisi status tidak valid seharusnya ditolak');
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('status', $e->errors);
            }
        }
    }
}
