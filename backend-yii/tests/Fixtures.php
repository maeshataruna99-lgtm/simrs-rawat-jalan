<?php

namespace app\tests;

use app\modules\system\role\Role;
use app\modules\system\user\User;

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
}
