<?php

use app\common\Migration;
use yii\db\Query;

/**
 * Menambah prefix_antrean (1 huruf A-Z, unik per poli aktif) pada m_poli untuk kode antrean, mis. U-001.
 * Data lama diisi dari huruf nama poli (tanpa kata "Poli") yang belum dipakai, lalu huruf A-Z sisanya.
 */
class m261122_030000_add_prefix_antrean_to_m_poli extends Migration
{
    public function safeUp()
    {
        $this->addColumn('m_poli', 'prefix_antrean', $this->char(1));

        $used = [];
        $rows = (new Query())->select(['id', 'nama'])->from('m_poli')->where(['deleted_at' => null])->orderBy('id')->all($this->db);
        foreach ($rows as $row) {
            $nama = strtoupper(preg_replace('/^\s*poli\s+/i', '', (string) $row['nama']));
            $candidates = array_merge(str_split(preg_replace('/[^A-Z]/', '', $nama)), range('A', 'Z'));
            $prefix = current(array_diff($candidates, $used));
            if ($prefix === false) {
                throw new RuntimeException('Huruf A-Z habis untuk prefix antrean poli aktif.');
            }
            $used[] = $prefix;
            $this->update('m_poli', ['prefix_antrean' => $prefix], ['id' => $row['id']]);
        }
        // Poli yang sudah dihapus tidak ikut index unik, cukup diberi nilai pengisi.
        $this->update('m_poli', ['prefix_antrean' => 'X'], ['prefix_antrean' => null]);

        $this->alterColumn('m_poli', 'prefix_antrean', $this->char(1)->notNull());
        $this->execute("ALTER TABLE m_poli ADD CONSTRAINT chk_m_poli_prefix_antrean CHECK (prefix_antrean ~ '^[A-Z]$')");
        $this->createActiveUniqueIndex('m_poli', 'prefix_antrean');
    }

    public function safeDown()
    {
        $this->dropIndex('uq_m_poli_prefix_antrean', 'm_poli');
        $this->execute('ALTER TABLE m_poli DROP CONSTRAINT chk_m_poli_prefix_antrean');
        $this->dropColumn('m_poli', 'prefix_antrean');
    }
}
