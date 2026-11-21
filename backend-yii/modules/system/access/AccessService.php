<?php

namespace app\modules\system\access;

use yii\db\Query;

/**
 * Pembaca hak akses role per menu dari m_role_access.
 * Hanya menu yang aktif dan belum dihapus yang dihitung. Hasil disimpan per request agar tidak query berulang.
 */
class AccessService
{
    public const PERMISSIONS = ['read', 'create', 'update', 'delete'];

    /** @var array<int, array<string, array<string, bool>>> Cache izin per role selama satu request. */
    private static array $cache = [];

    /**
     * Apakah role boleh melakukan aksi pada menu.
     *
     * @param string $permission Salah satu dari read, create, update, delete.
     *
     * Dipakai di: common/AccessFilter.
     */
    public function can(int $roleId, string $menuKode, string $permission): bool
    {
        return $this->permissionsFor($roleId)[$menuKode][$permission] ?? false;
    }

    /**
     * Seluruh izin role, dikelompokkan per kode menu.
     * Menu tanpa izin baca tidak dikembalikan karena role tidak boleh membukanya sama sekali.
     *
     * @return array<string, array{read: bool, create: bool, update: bool, delete: bool}>
     *
     * Dipakai di: can(), AuthService::profile() (poin 1.6).
     */
    public function permissionsFor(int $roleId): array
    {
        if (isset(self::$cache[$roleId])) {
            return self::$cache[$roleId];
        }

        $rows = (new Query())
            ->select(['m.kode', 'a.can_read', 'a.can_create', 'a.can_update', 'a.can_delete'])
            ->from('m_role_access a')
            ->innerJoin('m_menu m', 'm.id = a.menu_id AND m.is_active AND m.deleted_at IS NULL')
            ->where(['a.role_id' => $roleId, 'a.can_read' => true])
            ->all();

        $permissions = [];
        foreach ($rows as $row) {
            $permissions[$row['kode']] = [
                'read' => (bool) $row['can_read'],
                'create' => (bool) $row['can_create'],
                'update' => (bool) $row['can_update'],
                'delete' => (bool) $row['can_delete'],
            ];
        }

        return self::$cache[$roleId] = $permissions;
    }

    /**
     * Mengosongkan cache, dipanggil setelah hak akses diubah.
     *
     * Dipakai di: service hak akses role (poin 1.9), tests.
     */
    public static function clearCache(): void
    {
        self::$cache = [];
    }
}
