<?php

namespace app\tests;

use app\modules\system\role\Role;
use app\modules\system\user\User;
use Yii;

/**
 * Pembuat data uji yang dipakai berulang di banyak test.
 * Data otomatis hilang karena setiap test di-rollback oleh TestCase.
 */
final class Fixtures
{
    /**
     * Membuat role dengan kode tertentu.
     *
     * Dipakai di: test autentikasi dan hak akses.
     */
    public static function role(string $kode = 'admin', string $nama = 'Administrator'): Role
    {
        $role = new Role(['kode' => $kode, 'nama' => $nama]);
        $role->save(false);

        return $role;
    }

    /**
     * Membuat user aktif dengan password tertentu.
     *
     * Dipakai di: test autentikasi dan hak akses.
     */
    public static function user(Role $role, string $username = 'admin', string $password = 'rahasia123', array $attributes = []): User
    {
        $user = new User(array_merge(['username' => $username, 'nama' => ucfirst($username), 'role_id' => $role->id], $attributes));
        $user->setPassword($password);
        $user->save(false);

        return $user;
    }

    /**
     * Membuat menu dan mengembalikan id-nya.
     *
     * Dipakai di: test hak akses.
     */
    public static function menu(string $kode, array $attributes = []): int
    {
        Yii::$app->db->createCommand()->insert('m_menu', array_merge(['kode' => $kode, 'nama' => $kode], $attributes))->execute();

        return (int) Yii::$app->db->getLastInsertID('m_menu_id_seq');
    }

    /**
     * Memberi izin role pada menu. $flags memakai huruf R, C, U, D, contoh 'RC'.
     *
     * Dipakai di: test hak akses.
     */
    public static function grant(Role $role, int $menuId, string $flags): void
    {
        Yii::$app->db->createCommand()->insert('m_role_access', [
            'role_id' => $role->id,
            'menu_id' => $menuId,
            'can_read' => str_contains($flags, 'R'),
            'can_create' => str_contains($flags, 'C'),
            'can_update' => str_contains($flags, 'U'),
            'can_delete' => str_contains($flags, 'D'),
        ])->execute();
    }
}
