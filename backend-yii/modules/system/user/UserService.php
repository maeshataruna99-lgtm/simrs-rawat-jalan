<?php

namespace app\modules\system\user;

use app\common\ActiveRecord;
use app\common\CrudService;
use app\common\ValidationException;
use Yii;
use yii\web\ConflictHttpException;

/**
 * Pengelolaan akun user: tambah, ubah data, nonaktifkan, hapus, dan reset password.
 * Admin tidak boleh menonaktifkan, menghapus, atau mengganti role akunnya sendiri agar tidak terkunci.
 *
 * Dipakai di: UserController.
 */
class UserService extends CrudService
{
    protected function modelClass(): string
    {
        return User::class;
    }

    protected function searchClass(): string
    {
        return UserSearch::class;
    }

    /**
     * Membuat user baru; password wajib minimal 8 karakter dan disimpan sebagai hash.
     */
    public function create(array $data): ActiveRecord
    {
        $user = new User(['scenario' => User::SCENARIO_CREATE]);
        $user->load($data, '');
        if ($user->validate()) {
            $user->setPassword($user->password);
        }
        $this->save($user);

        return $user;
    }

    /**
     * Mengubah data user. Password tidak bisa diubah di sini, gunakan resetPassword().
     */
    public function update(int $id, array $data): ActiveRecord
    {
        /** @var User $user */
        $user = $this->find($id);
        unset($data['password']);
        $originalRole = $user->role_id;
        $user->load($data, '');

        if ($this->isSelf($user)) {
            $errors = [];
            if (!$user->is_active) {
                $errors['is_active'] = ['Akun Anda sendiri tidak bisa dinonaktifkan.'];
            }
            if ((int) $user->role_id !== (int) $originalRole) {
                $errors['role_id'] = ['Role akun Anda sendiri tidak bisa diganti.'];
            }
            if ($errors !== []) {
                throw new ValidationException($errors);
            }
        }

        $this->save($user);

        return $user;
    }

    /**
     * Mengganti password user oleh admin.
     *
     * @throws ValidationException Password kurang dari 8 karakter.
     *
     * Dipakai di: UserController::actionResetPassword().
     */
    public function resetPassword(int $id, ?string $password): void
    {
        /** @var User $user */
        $user = $this->find($id);
        if ($password === null || strlen($password) < 8) {
            throw new ValidationException(['password' => ['Password minimal 8 karakter.']]);
        }

        $user->setPassword($password);
        $user->save(false, ['password_hash', 'updated_at', 'updated_by']);
    }

    protected function beforeDelete(ActiveRecord $model): void
    {
        if ($this->isSelf($model)) {
            throw new ConflictHttpException('Akun Anda sendiri tidak bisa dihapus.');
        }
    }

    private function isSelf(ActiveRecord $user): bool
    {
        return !Yii::$app->user->isGuest && (int) Yii::$app->user->id === (int) $user->id;
    }
}
