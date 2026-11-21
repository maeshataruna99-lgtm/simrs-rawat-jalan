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
     * Pohon menu yang boleh dilihat role, dikelompokkan per modul sesuai urutan.
     * Menu induk (grup tanpa path) ikut tampil bila minimal satu anaknya boleh dibaca.
     * Modul tanpa menu yang terlihat tidak dikembalikan.
     *
     * @return array<int, array{kode: string, nama: string, icon: ?string, menus: array}>
     *
     * Dipakai di: AuthService::profile() untuk sidebar frontend.
     */
    public function menuTreeFor(int $roleId): array
    {
        $allowed = $this->permissionsFor($roleId);
        if ($allowed === []) {
            return [];
        }

        $rows = (new Query())
            ->select([
                'module_kode' => 'mo.kode', 'module_nama' => 'mo.nama', 'module_icon' => 'mo.icon',
                'm.id', 'm.parent_id', 'm.kode', 'm.nama', 'm.path', 'm.icon',
            ])
            ->from('m_module_menu mm')
            ->innerJoin('m_module mo', 'mo.id = mm.module_id AND mo.is_active AND mo.deleted_at IS NULL')
            ->innerJoin('m_menu m', 'm.id = mm.menu_id AND m.is_active AND m.deleted_at IS NULL')
            ->orderBy(['mo.urutan' => SORT_ASC, 'mm.urutan' => SORT_ASC, 'm.urutan' => SORT_ASC])
            ->all();

        $modules = [];
        foreach ($rows as $row) {
            $moduleKode = $row['module_kode'];
            $modules[$moduleKode] ??= [
                'kode' => $moduleKode,
                'nama' => $row['module_nama'],
                'icon' => $row['module_icon'],
                'rows' => [],
            ];
            $modules[$moduleKode]['rows'][] = $row;
        }

        $result = [];
        foreach ($modules as $module) {
            $menus = $this->buildTree($module['rows'], null, $allowed);
            if ($menus !== []) {
                unset($module['rows']);
                $result[] = $module + ['menus' => $menus];
            }
        }

        return $result;
    }

    /**
     * Menyusun menu bertingkat dari daftar datar. Menu daun hanya masuk bila punya izin baca;
     * menu induk masuk bila punya anak yang terlihat atau ia sendiri boleh dibaca.
     */
    private function buildTree(array $rows, ?int $parentId, array $allowed): array
    {
        $tree = [];
        foreach ($rows as $row) {
            if (($row['parent_id'] === null ? null : (int) $row['parent_id']) !== $parentId) {
                continue;
            }

            $children = $this->buildTree($rows, (int) $row['id'], $allowed);
            if ($children === [] && !isset($allowed[$row['kode']])) {
                continue;
            }

            $tree[] = [
                'kode' => $row['kode'],
                'nama' => $row['nama'],
                'path' => $row['path'],
                'icon' => $row['icon'],
                'children' => $children,
            ];
        }

        return $tree;
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
