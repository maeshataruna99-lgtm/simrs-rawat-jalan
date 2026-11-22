<?php

use app\common\Migration;
use yii\db\Query;

/**
 * Menambah menu izin `dashboard-keuangan` (tanpa path, tidak tampil di sidebar) untuk membatasi data
 * pendapatan, tagihan, dan pembayaran di dashboard. Akses bawaan: admin dan kasir.
 */
class m261122_040000_add_dashboard_keuangan_menu extends Migration
{
    public function safeUp()
    {
        $this->insert('m_menu', [
            'kode' => 'dashboard-keuangan',
            'nama' => 'Data Keuangan Dashboard',
            'path' => null,
            'icon' => 'wallet',
            'urutan' => 2,
            'is_active' => true,
        ]);
        $menuId = (int) $this->db->getLastInsertID('m_menu_id_seq');

        $moduleId = (new Query())->select('id')->from('m_module')
            ->where(['kode' => 'dashboard', 'deleted_at' => null])->scalar($this->db);
        if ($moduleId) {
            $this->insert('m_module_menu', ['module_id' => $moduleId, 'menu_id' => $menuId, 'urutan' => 2]);
        }

        $roleIds = (new Query())->select('id')->from('m_role')
            ->where(['kode' => ['admin', 'kasir'], 'deleted_at' => null])->column($this->db);
        foreach ($roleIds as $roleId) {
            $this->insert('m_role_access', [
                'role_id' => $roleId,
                'menu_id' => $menuId,
                'can_read' => true,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
            ]);
        }
    }

    public function safeDown()
    {
        $menuId = (new Query())->select('id')->from('m_menu')->where(['kode' => 'dashboard-keuangan'])->scalar($this->db);
        if ($menuId) {
            $this->delete('m_role_access', ['menu_id' => $menuId]);
            $this->delete('m_module_menu', ['menu_id' => $menuId]);
            $this->delete('m_menu', ['id' => $menuId]);
        }
    }
}
