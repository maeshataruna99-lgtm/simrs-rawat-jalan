<?php

/**
 * Data awal sistem: role, modul, menu, hak akses default, dan akun dummy per role.
 * Kode menu dipakai sebagai kunci izin, contoh `master-pasien:create`.
 *
 * Dipakai di: seeds/SystemSeeder.php.
 */

// Singkatan izin: R = baca, C = tambah, U = ubah, D = hapus.
return [
    'roles' => [
        ['kode' => 'admin', 'nama' => 'Administrator', 'keterangan' => 'Mengelola seluruh data dan pengaturan sistem'],
        ['kode' => 'pendaftaran', 'nama' => 'Petugas Pendaftaran', 'keterangan' => 'Mendaftarkan pasien dan mengelola antrean'],
        ['kode' => 'dokter', 'nama' => 'Dokter', 'keterangan' => 'Memeriksa pasien, tindakan, resep, dan order laboratorium'],
        ['kode' => 'farmasi', 'nama' => 'Petugas Farmasi', 'keterangan' => 'Memproses resep dan penyerahan obat'],
        ['kode' => 'laboratorium', 'nama' => 'Petugas Laboratorium', 'keterangan' => 'Memproses order dan hasil laboratorium'],
        ['kode' => 'kasir', 'nama' => 'Kasir', 'keterangan' => 'Mengelola tagihan dan pembayaran'],
    ],

    'modules' => [
        ['kode' => 'dashboard', 'nama' => 'Dashboard', 'icon' => 'layout-dashboard', 'urutan' => 1],
        ['kode' => 'pendaftaran', 'nama' => 'Pendaftaran', 'icon' => 'clipboard-list', 'urutan' => 2],
        ['kode' => 'pelayanan', 'nama' => 'Pelayanan Medis', 'icon' => 'stethoscope', 'urutan' => 3],
        ['kode' => 'farmasi', 'nama' => 'Farmasi', 'icon' => 'pill', 'urutan' => 4],
        ['kode' => 'laboratorium', 'nama' => 'Laboratorium', 'icon' => 'flask-conical', 'urutan' => 5],
        ['kode' => 'billing', 'nama' => 'Billing', 'icon' => 'receipt', 'urutan' => 6],
        ['kode' => 'master', 'nama' => 'Master Data', 'icon' => 'database', 'urutan' => 7],
        ['kode' => 'sistem', 'nama' => 'Sistem', 'icon' => 'settings', 'urutan' => 8],
    ],

    // [kode menu, nama, path, icon, kode modul]
    'menus' => [
        ['dashboard', 'Dashboard', '/dashboard', 'layout-dashboard', 'dashboard'],
        // Menu izin tanpa path (tidak tampil di sidebar): membuka data pendapatan dan pembayaran di dashboard.
        ['dashboard-keuangan', 'Data Keuangan Dashboard', null, 'wallet', 'dashboard'],
        ['pendaftaran', 'Pendaftaran Kunjungan', '/transaction/pendaftaran', 'user-plus', 'pendaftaran'],
        ['antrean', 'Antrean Poli', '/transaction/antrean', 'list-ordered', 'pendaftaran'],
        ['pemeriksaan', 'Pemeriksaan Pasien', '/transaction/pemeriksaan', 'stethoscope', 'pelayanan'],
        ['riwayat-medis', 'Riwayat Rekam Medis', '/transaction/riwayat-medis', 'history', 'pelayanan'],
        ['farmasi', 'Pelayanan Resep', '/transaction/farmasi', 'pill', 'farmasi'],
        ['laboratorium', 'Pemeriksaan Laboratorium', '/transaction/laboratorium', 'flask-conical', 'laboratorium'],
        ['billing', 'Tagihan dan Pembayaran', '/transaction/billing', 'receipt', 'billing'],
        ['master-pasien', 'Pasien', '/master/pasien', 'users', 'master'],
        ['master-dokter', 'Dokter dan Tenaga Medis', '/master/dokter', 'user-round', 'master'],
        ['master-poli', 'Poli', '/master/poli', 'building-2', 'master'],
        ['master-jadwal-dokter', 'Jadwal Praktik', '/master/jadwal-dokter', 'calendar-clock', 'master'],
        ['master-tindakan', 'Tindakan dan Tarif', '/master/tindakan', 'hand-heart', 'master'],
        ['master-obat', 'Obat dan Stok', '/master/obat', 'package', 'master'],
        ['master-pemeriksaan-lab', 'Pemeriksaan Laboratorium', '/master/pemeriksaan-lab', 'test-tube', 'master'],
        ['master-icd10', 'ICD-10', '/master/icd10', 'book-open', 'master'],
        ['system-user', 'Pengguna', '/system/user', 'user-cog', 'sistem'],
        ['system-role', 'Role', '/system/role', 'shield', 'sistem'],
        ['system-module', 'Modul', '/system/module', 'layout-grid', 'sistem'],
        ['system-menu', 'Menu', '/system/menu', 'menu', 'sistem'],
        ['system-role-access', 'Hak Akses Role', '/system/role-access', 'key-round', 'sistem'],
    ],

    // Administrator otomatis mendapat CRUD penuh di semua menu.
    'access' => [
        'pendaftaran' => [
            'dashboard' => 'R',
            'pendaftaran' => 'CRUD',
            'antrean' => 'RU',
            'master-pasien' => 'CRU',
            'master-dokter' => 'R',
            'master-poli' => 'R',
            'master-jadwal-dokter' => 'R',
        ],
        'dokter' => [
            'dashboard' => 'R',
            'antrean' => 'RU',
            'pemeriksaan' => 'CRUD',
            'riwayat-medis' => 'R',
            'master-tindakan' => 'R',
            'master-obat' => 'R',
            'master-pemeriksaan-lab' => 'R',
            'master-icd10' => 'R',
        ],
        'farmasi' => [
            'dashboard' => 'R',
            'farmasi' => 'CRU',
            'master-obat' => 'CRUD',
        ],
        'laboratorium' => [
            'dashboard' => 'R',
            'laboratorium' => 'CRU',
            'master-pemeriksaan-lab' => 'CRUD',
        ],
        'kasir' => [
            'dashboard' => 'R',
            'dashboard-keuangan' => 'R',
            'billing' => 'CRU',
        ],
    ],

    // Akun dummy: satu per role. Password diambil dari SEED_PASSWORD (bawaan: simrs123).
    'users' => [
        ['username' => 'admin', 'nama' => 'Administrator', 'role' => 'admin'],
        ['username' => 'pendaftaran', 'nama' => 'Rina Pendaftaran', 'role' => 'pendaftaran'],
        ['username' => 'dokter', 'nama' => 'dr. Budi Santoso', 'role' => 'dokter'],
        ['username' => 'farmasi', 'nama' => 'Dewi Apoteker', 'role' => 'farmasi'],
        ['username' => 'laboratorium', 'nama' => 'Agus Analis', 'role' => 'laboratorium'],
        ['username' => 'kasir', 'nama' => 'Sari Kasir', 'role' => 'kasir'],
    ],
];
