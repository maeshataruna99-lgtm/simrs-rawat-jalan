<?php

namespace app\modules\system\user;

use app\common\ActiveRecord;
use app\common\JwtService;
use app\modules\system\role\Role;
use Yii;
use yii\db\ActiveQuery;
use yii\web\IdentityInterface;

/**
 * Model tabel m_user sekaligus identitas login (Yii::$app->user->identity).
 *
 * @property int $id
 * @property string $username
 * @property string $password_hash
 * @property string $nama
 * @property int $role_id
 * @property int|null $dokter_id
 * @property bool $is_active
 * @property string|null $last_login_at
 * @property string|null $deleted_at
 * @property Role $role
 */
class User extends ActiveRecord implements IdentityInterface
{
    public static function tableName(): string
    {
        return 'm_user';
    }

    /**
     * Password hash tidak pernah ikut dikirim ke frontend.
     */
    public function fields(): array
    {
        $fields = parent::fields();
        unset($fields['password_hash']);

        return $fields;
    }

    public function getRole(): ActiveQuery
    {
        return $this->hasOne(Role::class, ['id' => 'role_id']);
    }

    /**
     * Menyimpan password dalam bentuk hash bcrypt.
     *
     * Dipakai di: seeder user (poin 1.4), service master user.
     */
    public function setPassword(string $password): void
    {
        $this->password_hash = Yii::$app->security->generatePasswordHash($password);
    }

    /**
     * Mencocokkan password dengan hash tersimpan.
     *
     * Dipakai di: AuthService::login().
     */
    public function validatePassword(string $password): bool
    {
        return Yii::$app->security->validatePassword($password, $this->password_hash);
    }

    public static function findIdentity($id): ?static
    {
        return static::findActive()->andWhere(['id' => $id, 'is_active' => true])->one();
    }

    /**
     * Mengambil user dari token JWT pada header Authorization.
     * Token tidak valid, kedaluwarsa, atau milik user nonaktif menghasilkan null (dibalas 401).
     *
     * Dipakai di: common/JwtAuth (filter autentikasi di BaseApiController).
     */
    public static function findIdentityByAccessToken($token, $type = null): ?static
    {
        $payload = JwtService::decode($token);

        return $payload === null ? null : static::findIdentity($payload->sub);
    }

    public function getId(): int
    {
        return $this->id;
    }

    /** Tidak dipakai: aplikasi tanpa session dan cookie. */
    public function getAuthKey(): ?string
    {
        return null;
    }

    /** Tidak dipakai: aplikasi tanpa session dan cookie. */
    public function validateAuthKey($authKey): bool
    {
        return false;
    }
}
