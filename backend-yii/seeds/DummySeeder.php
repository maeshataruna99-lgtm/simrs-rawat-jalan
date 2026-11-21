<?php

namespace app\seeds;

use Yii;
use yii\db\Query;

/**
 * Seeder data dummy end-to-end: 4 poli, 5 dokter, jadwal seminggu, master tindakan/obat/lab,
 * 50 pasien, dan kunjungan 30 hari lengkap dengan pemeriksaan, diagnosis, tindakan, resep, lab, invoice, dan pembayaran (poin 10.2).
 * Aman dijalankan berulang (idempoten).
 *
 * Dipakai di: commands/SeedController.php, tests/unit/seeds/DummySeederTest.php.
 */
class DummySeeder
{
    /**
     * Menjalankan pengisian seluruh data dummy end-to-end dalam satu transaksi.
     *
     * Dipakai di: SeedController::actionDummy, DummySeederTest.
     */
    public function run(): void
    {
        (new SystemSeeder())->run();
        (new Icd10Seeder())->run();

        Yii::$app->db->transaction(function () {
            $poliIds = $this->seedPoli();
            $dokterIds = $this->seedDokter();
            $this->tautkanUserDokter($dokterIds['DR001']);
            $jadwalMap = $this->seedJadwal($poliIds, $dokterIds);
            $tindakanMap = $this->seedTindakan($poliIds);
            $obatMap = $this->seedObat();
            $labMap = $this->seedLab();
            $pasienIds = $this->seedPasien();
            $this->seedKunjungan30Hari($poliIds, $dokterIds, $jadwalMap, $tindakanMap, $obatMap, $labMap, $pasienIds);
        });
    }

    /** @return array<string, int> kode => id */
    private function seedPoli(): array
    {
        $rows = [
            ['kode' => 'POLI-UMUM', 'nama' => 'Poli Umum', 'tarif_pendaftaran' => 25000],
            ['kode' => 'POLI-GIGI', 'nama' => 'Poli Gigi', 'tarif_pendaftaran' => 35000],
            ['kode' => 'POLI-ANAK', 'nama' => 'Poli Anak', 'tarif_pendaftaran' => 40000],
            ['kode' => 'POLI-PD', 'nama' => 'Poli Penyakit Dalam', 'tarif_pendaftaran' => 50000],
        ];
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['kode']] = $this->upsertByKode('m_poli', $row);
        }

        return $ids;
    }

    /** @return array<string, int> kode => id */
    private function seedDokter(): array
    {
        $rows = [
            ['kode' => 'DR001', 'nama' => 'dr. Budi Santoso', 'sip' => 'SIP/2026/001', 'spesialis' => 'Dokter Umum', 'jenis_tenaga' => 'dokter'],
            ['kode' => 'DR002', 'nama' => 'drg. Ratna Dewi', 'sip' => 'SIP/2026/002', 'spesialis' => 'Kedokteran Gigi', 'jenis_tenaga' => 'dokter'],
            ['kode' => 'DR003', 'nama' => 'dr. Hendra Wijaya, Sp.A', 'sip' => 'SIP/2026/003', 'spesialis' => 'Ilmu Kesehatan Anak', 'jenis_tenaga' => 'dokter'],
            ['kode' => 'DR004', 'nama' => 'dr. Siti Rahayu, Sp.PD', 'sip' => 'SIP/2026/004', 'spesialis' => 'Penyakit Dalam', 'jenis_tenaga' => 'dokter'],
            ['kode' => 'DR005', 'nama' => 'dr. Agus Pratama', 'sip' => 'SIP/2026/005', 'spesialis' => 'Dokter Umum', 'jenis_tenaga' => 'dokter'],
        ];
        $ids = [];
        foreach ($rows as $row) {
            $ids[$row['kode']] = $this->upsertByKode('m_dokter', $row);
        }

        return $ids;
    }

    /** Menautkan akun dummy `dokter` ke DR001 agar worklist dokter langsung menampilkan pasiennya. */
    private function tautkanUserDokter(int $dokterId): void
    {
        Yii::$app->db->createCommand()->update(
            'm_user',
            ['dokter_id' => $dokterId],
            ['username' => 'dokter', 'dokter_id' => null, 'deleted_at' => null]
        )->execute();
    }

    /**
     * Jadwal praktik sepanjang minggu (hari 1..7) untuk 4 poli & 5 dokter.
     *
     * @param array<string, int> $poliIds
     * @param array<string, int> $dokterIds
     * @return array<string, int> "{poliKode}:{hari}" => jadwal_id
     */
    private function seedJadwal(array $poliIds, array $dokterIds): array
    {
        $pasangan = [
            ['POLI-UMUM', 'DR001', '08:00', '14:00'],
            ['POLI-GIGI', 'DR002', '08:00', '14:00'],
            ['POLI-ANAK', 'DR003', '09:00', '15:00'],
            ['POLI-PD', 'DR004', '09:00', '15:00'],
            ['POLI-UMUM', 'DR005', '14:00', '20:00'],
        ];

        $map = [];
        for ($hari = 1; $hari <= 7; $hari++) {
            foreach ($pasangan as [$poliKode, $dokterKode, $mulai, $selesai]) {
                $poliId = $poliIds[$poliKode];
                $dokterId = $dokterIds[$dokterKode];
                $id = (new Query())->select('id')->from('m_jadwal_dokter')
                    ->where([
                        'dokter_id' => $dokterId,
                        'poli_id' => $poliId,
                        'hari' => $hari,
                        'jam_mulai' => $mulai,
                        'deleted_at' => null,
                    ])->scalar();

                if ($id === false) {
                    Yii::$app->db->createCommand()->insert('m_jadwal_dokter', [
                        'dokter_id' => $dokterId,
                        'poli_id' => $poliId,
                        'hari' => $hari,
                        'jam_mulai' => $mulai,
                        'jam_selesai' => $selesai,
                        'kuota' => 30,
                        'is_active' => true,
                    ])->execute();
                    $id = (int) Yii::$app->db->getLastInsertID('m_jadwal_dokter_id_seq');
                }
                if (!isset($map["{$poliKode}:{$hari}"])) {
                    $map["{$poliKode}:{$hari}"] = (int) $id;
                }
            }
        }

        return $map;
    }

    /**
     * @param array<string, int> $poliIds
     * @return array<string, array{id: int, tarif: float}>
     */
    private function seedTindakan(array $poliIds): array
    {
        $rows = [
            ['kode' => 'TND001', 'nama' => 'Konsultasi Dokter Umum', 'tarif' => 50000, 'poli_id' => $poliIds['POLI-UMUM']],
            ['kode' => 'TND002', 'nama' => 'Perawatan Luka Ringan', 'tarif' => 65000, 'poli_id' => $poliIds['POLI-UMUM']],
            ['kode' => 'TND003', 'nama' => 'Nebulizer', 'tarif' => 55000, 'poli_id' => $poliIds['POLI-UMUM']],
            ['kode' => 'TND004', 'nama' => 'Tambal Gigi Komposit', 'tarif' => 150000, 'poli_id' => $poliIds['POLI-GIGI']],
            ['kode' => 'TND005', 'nama' => 'Scaling Gigi', 'tarif' => 125000, 'poli_id' => $poliIds['POLI-GIGI']],
            ['kode' => 'TND006', 'nama' => 'Konsultasi Dokter Anak', 'tarif' => 85000, 'poli_id' => $poliIds['POLI-ANAK']],
            ['kode' => 'TND007', 'nama' => 'Konsultasi Penyakit Dalam', 'tarif' => 100000, 'poli_id' => $poliIds['POLI-PD']],
            ['kode' => 'TND008', 'nama' => 'Elektrokardiografi (EKG)', 'tarif' => 90000, 'poli_id' => $poliIds['POLI-PD']],
        ];
        $map = [];
        foreach ($rows as $row) {
            $id = $this->upsertByKode('m_tindakan', $row);
            $map[$row['kode']] = ['id' => $id, 'tarif' => (float) $row['tarif']];
        }

        return $map;
    }

    /** @return array<string, array{id: int, harga: float}> */
    private function seedObat(): array
    {
        $rows = [
            ['kode' => 'OBT001', 'nama' => 'Paracetamol 500mg', 'satuan' => 'tablet', 'harga' => 1500, 'stok' => 500],
            ['kode' => 'OBT002', 'nama' => 'Amoxicillin 500mg', 'satuan' => 'kapsul', 'harga' => 3000, 'stok' => 400],
            ['kode' => 'OBT003', 'nama' => 'Omeprazole 20mg', 'satuan' => 'kapsul', 'harga' => 4500, 'stok' => 300],
            ['kode' => 'OBT004', 'nama' => 'Amlodipine 5mg', 'satuan' => 'tablet', 'harga' => 2500, 'stok' => 350],
            ['kode' => 'OBT005', 'nama' => 'Metformin 500mg', 'satuan' => 'tablet', 'harga' => 2000, 'stok' => 350],
            ['kode' => 'OBT006', 'nama' => 'Cetirizine 10mg', 'satuan' => 'tablet', 'harga' => 2500, 'stok' => 300],
            ['kode' => 'OBT007', 'nama' => 'Ibuprofen 400mg', 'satuan' => 'tablet', 'harga' => 2000, 'stok' => 300],
            ['kode' => 'OBT008', 'nama' => 'Salbutamol 2mg', 'satuan' => 'tablet', 'harga' => 1800, 'stok' => 250],
            ['kode' => 'OBT009', 'nama' => 'Oralit Sachet', 'satuan' => 'sachet', 'harga' => 3500, 'stok' => 200],
            ['kode' => 'OBT010', 'nama' => 'Vitamin C 500mg', 'satuan' => 'tablet', 'harga' => 1200, 'stok' => 500],
        ];
        $map = [];
        foreach ($rows as $row) {
            $id = (new Query())->select('id')->from('m_obat')
                ->where(['kode' => $row['kode'], 'deleted_at' => null])->scalar();
            if ($id === false) {
                Yii::$app->db->createCommand()->insert('m_obat', $row)->execute();
                $id = (int) Yii::$app->db->getLastInsertID('m_obat_id_seq');
                Yii::$app->db->createCommand()->insert('t_stok_mutasi', [
                    'obat_id' => $id,
                    'jenis' => 'masuk',
                    'qty' => $row['stok'],
                    'stok_sebelum' => 0,
                    'stok_sesudah' => $row['stok'],
                    'referensi' => 'Stok awal data dummy',
                ])->execute();
            }
            $map[$row['kode']] = ['id' => (int) $id, 'harga' => (float) $row['harga']];
        }

        return $map;
    }

    /** @return array<string, array{id: int, tarif: float, satuan: string, rujukan: string}> */
    private function seedLab(): array
    {
        $rows = [
            ['kode' => 'LAB001', 'nama' => 'Hemoglobin', 'satuan' => 'g/dL', 'nilai_rujukan' => '12-16', 'tarif' => 35000],
            ['kode' => 'LAB002', 'nama' => 'Gula Darah Puasa', 'satuan' => 'mg/dL', 'nilai_rujukan' => '70-110', 'tarif' => 40000],
            ['kode' => 'LAB003', 'nama' => 'Kolesterol Total', 'satuan' => 'mg/dL', 'nilai_rujukan' => '< 200', 'tarif' => 55000],
            ['kode' => 'LAB004', 'nama' => 'Asam Urat', 'satuan' => 'mg/dL', 'nilai_rujukan' => '3.5-7.2', 'tarif' => 45000],
            ['kode' => 'LAB005', 'nama' => 'Leukosit', 'satuan' => '/uL', 'nilai_rujukan' => '4000-10000', 'tarif' => 35000],
        ];
        $map = [];
        foreach ($rows as $row) {
            $id = $this->upsertByKode('m_pemeriksaan_lab', $row);
            $map[$row['kode']] = [
                'id' => $id,
                'tarif' => (float) $row['tarif'],
                'satuan' => $row['satuan'],
                'rujukan' => $row['nilai_rujukan'],
            ];
        }

        return $map;
    }

    /** @return int[] 50 id pasien */
    private function seedPasien(): array
    {
        $namaDepan = ['Adi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gita', 'Hadi', 'Indah', 'Joko'];
        $namaBelakang = ['Santoso', 'Wijaya', 'Lestari', 'Pratama', 'Kusuma'];
        $ids = [];

        for ($i = 1; $i <= 50; $i++) {
            $noRm = 'RM' . str_pad((string) $i, 6, '0', STR_PAD_LEFT);
            $nik = '327301' . str_pad((string) (1000000000 + $i), 10, '0', STR_PAD_LEFT);
            $id = (new Query())->select('id')->from('m_pasien')
                ->where(['no_rm' => $noRm, 'deleted_at' => null])->scalar();

            if ($id === false) {
                $depan = $namaDepan[($i - 1) % count($namaDepan)];
                $belakang = $namaBelakang[(int) floor(($i - 1) / count($namaDepan)) % count($namaBelakang)];
                $tahun = 1970 + ($i % 35);
                $bulan = str_pad((string) (($i % 12) + 1), 2, '0', STR_PAD_LEFT);
                $hari = str_pad((string) (($i % 27) + 1), 2, '0', STR_PAD_LEFT);

                Yii::$app->db->createCommand()->insert('m_pasien', [
                    'no_rm' => $noRm,
                    'nik' => $nik,
                    'nama' => "{$depan} {$belakang}",
                    'tgl_lahir' => "{$tahun}-{$bulan}-{$hari}",
                    'jenis_kelamin' => $i % 2 === 0 ? 'P' : 'L',
                    'alamat' => "Jl. Kesehatan No. {$i}, Bandung",
                    'no_hp' => '0812' . str_pad((string) (10000000 + $i), 8, '0', STR_PAD_LEFT),
                ])->execute();
                $id = (int) Yii::$app->db->getLastInsertID('m_pasien_id_seq');
            }
            $ids[] = (int) $id;
        }

        // Pastikan counter RM minimal 50 agar pasien baru tidak bentrok.
        Yii::$app->db->createCommand(
            "INSERT INTO t_sequence_counter (kode, periode, nilai_terakhir) VALUES ('RM', 'ALL', 50)
             ON CONFLICT (kode, periode) DO UPDATE SET nilai_terakhir = GREATEST(t_sequence_counter.nilai_terakhir, 50)"
        )->execute();

        return $ids;
    }

    /**
     * Membuat 60 kunjungan tersebar pada 30 hari terakhir (2 kunjungan/hari) beserta transaksi klinis, lab, farmasi, dan billing.
     *
     * @param array<string, int> $poliIds
     * @param array<string, int> $dokterIds
     * @param array<string, int> $jadwalMap
     * @param array<string, array{id: int, tarif: float}> $tindakanMap
     * @param array<string, array{id: int, harga: float}> $obatMap
     * @param array<string, array{id: int, tarif: float, satuan: string, rujukan: string}> $labMap
     * @param int[] $pasienIds
     */
    private function seedKunjungan30Hari(
        array $poliIds,
        array $dokterIds,
        array $jadwalMap,
        array $tindakanMap,
        array $obatMap,
        array $labMap,
        array $pasienIds
    ): void {
        $kasirId = (int) ((new Query())->select('id')->from('m_user')->where(['username' => 'kasir'])->scalar() ?: 1);
        $farmasiId = (int) ((new Query())->select('id')->from('m_user')->where(['username' => 'farmasi'])->scalar() ?: 1);
        $labUserId = (int) ((new Query())->select('id')->from('m_user')->where(['username' => 'laboratorium'])->scalar() ?: 1);
        $icdIds = (new Query())->select('id')->from('m_icd10')->where(['deleted_at' => null])->orderBy(['id' => SORT_ASC])->limit(10)->column();

        $poliConfig = [
            ['POLI-UMUM', 'DR001', 25000.0, 'TND001', 'OBT001', 'LAB001'],
            ['POLI-GIGI', 'DR002', 35000.0, 'TND004', 'OBT007', 'LAB005'],
            ['POLI-ANAK', 'DR003', 40000.0, 'TND006', 'OBT009', 'LAB001'],
            ['POLI-PD', 'DR004', 50000.0, 'TND007', 'OBT004', 'LAB002'],
        ];

        $keluhanList = [
            'Demam dan batuk sejak 3 hari lalu',
            'Sakit gigi geraham kanan bawah',
            'Batuk pilek dan nafsu makan menurun',
            'Kontrol tekanan darah dan pusing ringan',
            'Nyeri ulu hati setelah makan',
        ];

        $today = new \DateTimeImmutable('today');
        $idx = 0;

        for ($offset = 29; $offset >= 0; $offset--) {
            $tglObj = $today->modify("-{$offset} days");
            $tgl = $tglObj->format('Y-m-d');
            $ymd = $tglObj->format('Ymd');
            $isoHari = (int) $tglObj->format('N');

            for ($slot = 1; $slot <= 2; $slot++) {
                $idx++;
                $noKunjungan = "RJ{$ymd}" . str_pad((string) $slot, 4, '0', STR_PAD_LEFT);
                if ((new Query())->from('t_kunjungan')->where(['no_kunjungan' => $noKunjungan])->exists()) {
                    continue;
                }

                // Hari ini slot 1 selalu di Poli Umum dr. Budi (DR001) agar worklist dokter & antrean terisi.
                $cfg = ($offset === 0 && $slot === 1) ? $poliConfig[0] : $poliConfig[($idx - 1) % count($poliConfig)];
                [$poliKode, $dokterKode, $tarifDaftar, $tndKode, $obtKode, $labKode] = $cfg;

                $pasienId = $pasienIds[($idx - 1) % count($pasienIds)];
                $poliId = $poliIds[$poliKode];
                $dokterId = $dokterIds[$dokterKode];
                $jadwalId = $jadwalMap["{$poliKode}:{$isoHari}"];
                $isHariIniTerbuka = $offset === 0 && $slot === 1;
                $statusKunjungan = $isHariIniTerbuka ? 'menunggu' : 'selesai';

                Yii::$app->db->createCommand()->insert('t_kunjungan', [
                    'no_kunjungan' => $noKunjungan,
                    'pasien_id' => $pasienId,
                    'poli_id' => $poliId,
                    'dokter_id' => $dokterId,
                    'jadwal_id' => $jadwalId,
                    'tgl_kunjungan' => $tgl,
                    'no_antrean' => $slot,
                    'status' => $statusKunjungan,
                ])->execute();
                $kunjunganId = (int) Yii::$app->db->getLastInsertID('t_kunjungan_id_seq');

                Yii::$app->db->createCommand()->insert('t_kunjungan_status_log', [
                    'kunjungan_id' => $kunjunganId,
                    'status_lama' => null,
                    'status_baru' => 'menunggu',
                    'waktu' => "{$tgl} 08:30:00",
                ])->execute();

                if ($isHariIniTerbuka) {
                    continue;
                }

                Yii::$app->db->createCommand()->insert('t_kunjungan_status_log', [
                    'kunjungan_id' => $kunjunganId,
                    'status_lama' => 'menunggu',
                    'status_baru' => 'selesai',
                    'waktu' => "{$tgl} 09:30:00",
                ])->execute();

                // Pemeriksaan & diagnosis
                Yii::$app->db->createCommand()->insert('t_pemeriksaan', [
                    'kunjungan_id' => $kunjunganId,
                    'dokter_id' => $dokterId,
                    'keluhan_utama' => $keluhanList[$idx % count($keluhanList)],
                    'anamnesis' => 'Pasien datang rawat jalan, kondisi umum baik dan sadar penuh.',
                    'td_sistolik' => 115 + (($idx % 4) * 5),
                    'td_diastolik' => 75 + (($idx % 3) * 5),
                    'nadi' => 74 + ($idx % 12),
                    'suhu' => 36.5 + (($idx % 3) * 0.3),
                    'respirasi' => 18 + ($idx % 3),
                    'spo2' => 98,
                    'berat_badan' => 55 + ($idx % 20),
                    'tinggi_badan' => 160 + ($idx % 15),
                    'pemeriksaan_fisik' => 'Thoraks dan abdomen dalam batas normal.',
                ])->execute();

                if ($icdIds !== []) {
                    Yii::$app->db->createCommand()->insert('t_diagnosis', [
                        'kunjungan_id' => $kunjunganId,
                        'icd10_id' => (int) $icdIds[$idx % count($icdIds)],
                        'jenis' => 'utama',
                    ])->execute();
                }

                // Tindakan
                $tnd = $tindakanMap[$tndKode];
                $qtyTnd = $idx % 5 === 0 ? 2 : 1;
                $subTnd = round($tnd['tarif'] * $qtyTnd, 2);
                Yii::$app->db->createCommand()->insert('t_tindakan', [
                    'kunjungan_id' => $kunjunganId,
                    'tindakan_id' => $tnd['id'],
                    'qty' => $qtyTnd,
                    'tarif' => $tnd['tarif'],
                    'subtotal' => $subTnd,
                    'dokter_id' => $dokterId,
                    'status' => 'aktif',
                ])->execute();
                $tindakanItemId = (int) Yii::$app->db->getLastInsertID('t_tindakan_id_seq');

                // Resep obat
                $obt = $obatMap[$obtKode];
                $jmlObat = 6 + (($idx % 3) * 2);
                $subObat = round($obt['harga'] * $jmlObat, 2);
                $noResep = "RSP{$ymd}" . str_pad((string) $slot, 4, '0', STR_PAD_LEFT);
                Yii::$app->db->createCommand()->insert('t_resep', [
                    'no_resep' => $noResep,
                    'kunjungan_id' => $kunjunganId,
                    'dokter_id' => $dokterId,
                    'status' => 'diserahkan',
                    'diserahkan_oleh' => $farmasiId,
                    'diserahkan_at' => "{$tgl} 10:00:00",
                ])->execute();
                $resepId = (int) Yii::$app->db->getLastInsertID('t_resep_id_seq');
                Yii::$app->db->createCommand()->insert('t_resep_detail', [
                    'resep_id' => $resepId,
                    'obat_id' => $obt['id'],
                    'dosis' => '1 unit',
                    'frekuensi' => '3x1 sesudah makan',
                    'jumlah' => $jmlObat,
                    'harga' => $obt['harga'],
                    'subtotal' => $subObat,
                ])->execute();
                $resepDetailId = (int) Yii::$app->db->getLastInsertID('t_resep_detail_id_seq');

                // Order lab untuk ~40% kunjungan
                $labDetailId = null;
                $tarifLab = 0.0;
                if ($idx % 5 === 0 || $idx % 5 === 2) {
                    $lab = $labMap[$labKode];
                    $tarifLab = $lab['tarif'];
                    $noOrder = "LAB{$ymd}" . str_pad((string) $slot, 4, '0', STR_PAD_LEFT);
                    Yii::$app->db->createCommand()->insert('t_order_lab', [
                        'no_order' => $noOrder,
                        'kunjungan_id' => $kunjunganId,
                        'dokter_id' => $dokterId,
                        'status' => 'selesai',
                        'catatan_klinis' => 'Pemeriksaan penunjang rutin',
                    ])->execute();
                    $orderId = (int) Yii::$app->db->getLastInsertID('t_order_lab_id_seq');
                    Yii::$app->db->createCommand()->insert('t_order_lab_detail', [
                        'order_id' => $orderId,
                        'pemeriksaan_lab_id' => $lab['id'],
                        'tarif' => $lab['tarif'],
                        'hasil' => $labKode === 'LAB002' ? '96' : '13.5',
                        'satuan' => $lab['satuan'],
                        'nilai_rujukan' => $lab['rujukan'],
                        'flag' => 'normal',
                        'idempotency_key' => "seed-lab-{$noOrder}",
                        'diinput_oleh' => $labUserId,
                        'diinput_at' => "{$tgl} 09:45:00",
                    ])->execute();
                    $labDetailId = (int) Yii::$app->db->getLastInsertID('t_order_lab_detail_id_seq');
                }

                // Invoice + item + pembayaran (campuran lunas, dibayar_sebagian, belum_dibayar)
                $totalInvoice = round($tarifDaftar + $subTnd + $subObat + $tarifLab, 2);
                if ($idx % 12 === 0) {
                    $invStatus = 'belum_dibayar';
                    $totalBayar = 0.0;
                } elseif ($idx % 9 === 0) {
                    $invStatus = 'dibayar_sebagian';
                    $totalBayar = round($totalInvoice / 2, 2);
                } else {
                    $invStatus = 'lunas';
                    $totalBayar = $totalInvoice;
                }

                $noInvoice = "INV{$ymd}" . str_pad((string) $slot, 4, '0', STR_PAD_LEFT);
                Yii::$app->db->createCommand()->insert('t_invoice', [
                    'no_invoice' => $noInvoice,
                    'kunjungan_id' => $kunjunganId,
                    'total' => $totalInvoice,
                    'total_bayar' => $totalBayar,
                    'status' => $invStatus,
                ])->execute();
                $invoiceId = (int) Yii::$app->db->getLastInsertID('t_invoice_id_seq');

                Yii::$app->db->createCommand()->insert('t_invoice_item', [
                    'invoice_id' => $invoiceId, 'sumber' => 'pendaftaran', 'referensi_id' => $kunjunganId,
                    'deskripsi' => 'Biaya Pendaftaran', 'qty' => 1, 'harga' => $tarifDaftar, 'subtotal' => $tarifDaftar, 'is_void' => false,
                ])->execute();
                Yii::$app->db->createCommand()->insert('t_invoice_item', [
                    'invoice_id' => $invoiceId, 'sumber' => 'tindakan', 'referensi_id' => $tindakanItemId,
                    'deskripsi' => 'Tindakan Medis', 'qty' => $qtyTnd, 'harga' => $tnd['tarif'], 'subtotal' => $subTnd, 'is_void' => false,
                ])->execute();
                Yii::$app->db->createCommand()->insert('t_invoice_item', [
                    'invoice_id' => $invoiceId, 'sumber' => 'obat', 'referensi_id' => $resepDetailId,
                    'deskripsi' => 'Obat Resep', 'qty' => $jmlObat, 'harga' => $obt['harga'], 'subtotal' => $subObat, 'is_void' => false,
                ])->execute();
                if ($labDetailId !== null) {
                    Yii::$app->db->createCommand()->insert('t_invoice_item', [
                        'invoice_id' => $invoiceId, 'sumber' => 'lab', 'referensi_id' => $labDetailId,
                        'deskripsi' => 'Pemeriksaan Laboratorium', 'qty' => 1, 'harga' => $tarifLab, 'subtotal' => $tarifLab, 'is_void' => false,
                    ])->execute();
                }

                if ($totalBayar > 0) {
                    $metode = $idx % 2 === 0 ? 'non_tunai' : 'tunai';
                    $noBayar = "PAY{$ymd}" . str_pad((string) $slot, 4, '0', STR_PAD_LEFT);
                    Yii::$app->db->createCommand()->insert('t_pembayaran', [
                        'no_pembayaran' => $noBayar,
                        'invoice_id' => $invoiceId,
                        'idempotency_key' => "seed-pay-{$noBayar}",
                        'metode' => $metode,
                        'jumlah' => $totalBayar,
                        'no_referensi' => $metode === 'non_tunai' ? "QRIS-{$ymd}-{$slot}" : null,
                        'kasir_id' => $kasirId,
                        'dibayar_at' => "{$tgl} 10:15:00",
                    ])->execute();
                }
            }

            // Sinkronkan counter harian agar transaksi baru dari API tidak bentrok nomor dokumen.
            foreach (['KUNJUNGAN', 'RESEP', 'ORDER_LAB', 'INVOICE', 'PEMBAYARAN'] as $seqKode) {
                Yii::$app->db->createCommand(
                    'INSERT INTO t_sequence_counter (kode, periode, nilai_terakhir, updated_at) VALUES (:kode, :periode, 2, CURRENT_TIMESTAMP)
                     ON CONFLICT (kode, periode) DO UPDATE SET nilai_terakhir = GREATEST(t_sequence_counter.nilai_terakhir, 2)',
                    [':kode' => $seqKode, ':periode' => $ymd]
                )->execute();
            }
        }
    }

    /**
     * Upsert baris master aktif berdasarkan kolom `kode`.
     *
     * @param array<string, mixed> $row
     */
    private function upsertByKode(string $table, array $row): int
    {
        $id = (new Query())->select('id')->from($table)
            ->where(['kode' => $row['kode'], 'deleted_at' => null])->scalar();

        if ($id === false) {
            Yii::$app->db->createCommand()->insert($table, $row)->execute();

            return (int) Yii::$app->db->getLastInsertID("{$table}_id_seq");
        }

        Yii::$app->db->createCommand()->update($table, $row, ['id' => $id])->execute();

        return (int) $id;
    }
}
