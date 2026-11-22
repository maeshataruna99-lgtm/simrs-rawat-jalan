<?php

namespace app\modules\system\access;

use app\common\ValidationException;
use app\modules\system\role\Role;
use Yii;
use yii\db\Query;
use yii\web\NotFoundHttpException;

/**
 * Matriks hak akses satu role: semua menu aktif × izin baca/tambah/ubah/hapus.
 *
 * Dipakai di: RoleAccessController.
 */
class RoleAccessService
{
    /** Menu yang dipakai untuk mengelola hak akses; tidak boleh dicabut dari role sendiri. */
    private const SELF_MENU = 'system-role-access';

    /**
     * Matriks untuk ditampilkan sebagai tabel centang, dikelompokkan per modul.
     * Menu yang belum punya baris akses tampil dengan semua izin false.
     *
     * Dipakai di: RoleAccessController::actionView().
     */
    public function matrix(int $roleId): array
    {
        $role = $this->findRole($roleId);

        $rows = (new Query())
            ->select([
                'module_id' => 'mo.id', 'module_kode' => 'mo.kode', 'module_nama' => 'mo.nama',
                'm.id', 'm.parent_id', 'm.kode', 'm.nama',
                'can_read' => 'COALESCE(a.can_read, false)',
                'can_create' => 'COALESCE(a.can_create, false)',
                'can_update' => 'COALESCE(a.can_update, false)',
                'can_delete' => 'COALESCE(a.can_delete, false)',
            ])
            ->from('m_menu m')
            ->leftJoin('m_module_menu mm', 'mm.menu_id = m.id')
            ->leftJoin('m_module mo', 'mo.id = mm.module_id AND mo.deleted_at IS NULL')
            ->leftJoin('m_role_access a', 'a.menu_id = m.id AND a.role_id = :role', ['role' => $role->id])
            ->where(['m.deleted_at' => null])
            ->orderBy(['mo.urutan' => SORT_ASC, 'mm.urutan' => SORT_ASC, 'm.urutan' => SORT_ASC])
            ->all();

        $modules = [];
        foreach ($rows as $row) {
            $key = $row['module_id'] ?? 0;
            $modules[$key] ??= [
                'id' => $row['module_id'],
                'kode' => $row['module_kode'],
                'nama' => $row['module_nama'] ?? 'Tanpa modul',
                'menus' => [],
            ];
            $modules[$key]['menus'][] = [
                'id' => $row['id'],
                'parent_id' => $row['parent_id'],
                'kode' => $row['kode'],
                'nama' => $row['nama'],
                'can_read' => (bool) $row['can_read'],
                'can_create' => (bool) $row['can_create'],
                'can_update' => (bool) $row['can_update'],
                'can_delete' => (bool) $row['can_delete'],
            ];
        }

        return [
            'role' => ['id' => $role->id, 'kode' => $role->kode, 'nama' => $role->nama],
            'modules' => array_values($modules),
        ];
    }

    /**
     * Mengganti seluruh hak akses role dengan isi matriks yang dikirim.
     * - Izin tambah/ubah/hapus otomatis menyertakan izin baca.
     * - Menu tanpa izin apa pun dihapus barisnya.
     * - Admin tidak bisa mencabut akses pengelolaan hak akses dari role-nya sendiri (mencegah terkunci).
     *
     * @param array<int, array{menu_id: int, can_read?: bool, can_create?: bool, can_update?: bool, can_delete?: bool}> $items
     *
     * @throws ValidationException
     *
     * Dipakai di: RoleAccessController::actionUpdate().
     */
    public function replace(int $roleId, array $items): array
    {
        $role = $this->findRole($roleId);
        $rows = $this->normalize($items);

        if ($this->isOwnRole($role->id)) {
            $this->guardSelfAccess($rows);
        }

        $lama = (new Query())
            ->select(['menu_id', 'can_read', 'can_create', 'can_update', 'can_delete'])
            ->from('m_role_access')
            ->where(['role_id' => $role->id])
            ->indexBy('menu_id')
            ->all();
        Yii::$app->db->transaction(function () use ($role, $rows, $lama) {
            $db = Yii::$app->db;
            \app\common\AuditLog::catat('m_role_access', $role->id, 'update', ['akses' => $lama], ['akses' => $rows]);
            $db->createCommand()->delete('m_role_access', ['role_id' => $role->id])->execute();
            foreach ($rows as $menuId => $flags) {
                if (in_array(true, $flags, true)) {
                    $db->createCommand()->insert('m_role_access', array_merge(
                        ['role_id' => $role->id, 'menu_id' => $menuId, 'created_by' => Yii::$app->user->id],
                        $flags
                    ))->execute();
                }
            }
        });

        AccessService::clearCache();

        return $this->matrix($role->id);
    }

    /**
     * Validasi isi matriks dan ubah menjadi peta menu_id => flag izin.
     *
     * @return array<int, array{can_read: bool, can_create: bool, can_update: bool, can_delete: bool}>
     */
    private function normalize(array $items): array
    {
        $activeMenuIds = (new Query())->select('id')->from('m_menu')->where(['deleted_at' => null])->column();
        $activeMenuIds = array_map('intval', $activeMenuIds);

        $rows = [];
        $errors = [];
        foreach ($items as $index => $item) {
            $menuId = filter_var($item['menu_id'] ?? null, FILTER_VALIDATE_INT);
            if ($menuId === false || !in_array($menuId, $activeMenuIds, true)) {
                $errors["access.{$index}.menu_id"] = ['Menu tidak ditemukan.'];
                continue;
            }

            $flags = [];
            foreach (['can_read', 'can_create', 'can_update', 'can_delete'] as $column) {
                $flags[$column] = filter_var($item[$column] ?? false, FILTER_VALIDATE_BOOLEAN);
            }
            $flags['can_read'] = $flags['can_read'] || $flags['can_create'] || $flags['can_update'] || $flags['can_delete'];
            $rows[$menuId] = $flags;
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return $rows;
    }

    private function guardSelfAccess(array $rows): void
    {
        $selfMenuId = (int) (new Query())->select('id')->from('m_menu')
            ->where(['kode' => self::SELF_MENU, 'deleted_at' => null])->scalar();
        $flags = $rows[$selfMenuId] ?? null;

        if ($selfMenuId !== 0 && (!$flags || !$flags['can_update'])) {
            throw new ValidationException(
                ['access' => ['Akses ubah "Hak Akses Role" tidak boleh dicabut dari role Anda sendiri.']],
                'Perubahan ditolak.'
            );
        }
    }

    private function isOwnRole(int $roleId): bool
    {
        return !Yii::$app->user->isGuest && (int) Yii::$app->user->identity->role_id === $roleId;
    }

    private function findRole(int $roleId): Role
    {
        $role = Role::findActive()->andWhere(['id' => $roleId])->one();
        if ($role === null) {
            throw new NotFoundHttpException('Role tidak ditemukan.');
        }

        return $role;
    }
}
