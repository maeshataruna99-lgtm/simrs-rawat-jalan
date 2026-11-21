<?php

namespace app\seeds;

use app\modules\system\role\Role;
use app\modules\system\user\User;
use Yii;
use yii\db\Query;

/**
 * Pengisi data awal sistem dari seeds/data/system.php.
 * Aman dijalankan berulang: data dicocokkan berdasarkan kode, lalu dibuat atau diperbarui.
 * Password user yang sudah ada tidak diubah agar tidak menimpa password yang diganti admin.
 *
 * Dipakai di: commands/SeedController.php, tests/unit/seeds/SystemSeederTest.php.
 */
class SystemSeeder
{
    private const PERMISSIONS = ['R' => 'can_read', 'C' => 'can_create', 'U' => 'can_update', 'D' => 'can_delete'];

    public function run(): void
    {
        $data = require __DIR__ . '/data/system.php';

        Yii::$app->db->transaction(function () use ($data) {
            $roleIds = $this->seedByKode('m_role', $data['roles']);
            $moduleIds = $this->seedByKode('m_module', $data['modules']);
            $menuIds = $this->seedMenus($data['menus'], $moduleIds);
            $this->seedAccess($data['access'], $roleIds, $menuIds);
            $this->seedUsers($data['users']);
        });
    }

    /**
     * Membuat atau memperbarui baris berdasarkan kolom `kode` (hanya baris yang belum dihapus).
     *
     * @return array<string, int> Peta kode => id.
     */
    private function seedByKode(string $table, array $rows): array
    {
        $ids = [];
        foreach ($rows as $row) {
            $id = (new Query())->select('id')->from($table)
                ->where(['kode' => $row['kode'], 'deleted_at' => null])->scalar();

            if ($id === false) {
                Yii::$app->db->createCommand()->insert($table, $row)->execute();
                $id = Yii::$app->db->getLastInsertID("{$table}_id_seq");
            } else {
                Yii::$app->db->createCommand()->update($table, $row, ['id' => $id])->execute();
            }
            $ids[$row['kode']] = (int) $id;
        }

        return $ids;
    }

    private function seedMenus(array $menus, array $moduleIds): array
    {
        $rows = [];
        foreach ($menus as $urutan => [$kode, $nama, $path, $icon]) {
            $rows[] = ['kode' => $kode, 'nama' => $nama, 'path' => $path, 'icon' => $icon, 'urutan' => $urutan + 1];
        }
        $menuIds = $this->seedByKode('m_menu', $rows);

        foreach ($menus as $urutan => [$kode, , , , $moduleKode]) {
            Yii::$app->db->createCommand()->upsert(
                'm_module_menu',
                ['module_id' => $moduleIds[$moduleKode], 'menu_id' => $menuIds[$kode], 'urutan' => $urutan + 1],
                ['urutan' => $urutan + 1]
            )->execute();
        }

        return $menuIds;
    }

    private function seedAccess(array $access, array $roleIds, array $menuIds): void
    {
        $access['admin'] = array_fill_keys(array_keys($menuIds), 'CRUD');

        foreach ($access as $roleKode => $menus) {
            foreach ($menus as $menuKode => $flags) {
                $row = ['role_id' => $roleIds[$roleKode], 'menu_id' => $menuIds[$menuKode]];
                foreach (self::PERMISSIONS as $letter => $column) {
                    $row[$column] = str_contains($flags, $letter);
                }
                Yii::$app->db->createCommand()->upsert('m_role_access', $row, true)->execute();
            }
        }
    }

    private function seedUsers(array $users): void
    {
        $password = getenv('SEED_PASSWORD') ?: 'simrs123';

        foreach ($users as $data) {
            $user = User::findActive()->andWhere(['username' => $data['username']])->one() ?? new User();
            $user->username = $data['username'];
            $user->nama = $data['nama'];
            $user->role_id = Role::findActive()->select('id')->andWhere(['kode' => $data['role']])->scalar();
            if ($user->isNewRecord) {
                $user->setPassword($password);
            }
            $user->save(false);
        }
    }
}
