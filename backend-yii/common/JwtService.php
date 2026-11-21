<?php

namespace app\common;

use app\modules\system\user\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;
use stdClass;
use Throwable;

/**
 * Penerbitan dan verifikasi token JWT (HS256).
 * Secret yang sama dipakai service Node untuk memverifikasi token (poin 1.7).
 */
class JwtService
{
    private const ALGORITHM = 'HS256';
    private const ISSUER = 'simrs-backend';

    /**
     * Membuat token untuk user yang berhasil login.
     * Payload berisi id user (`sub`), kode role, dan nama agar Node tidak perlu query ke Yii.
     *
     * @return array{token: string, expires_at: int}
     *
     * Dipakai di: AuthService::login().
     */
    public static function issue(User $user): array
    {
        $now = time();
        $expiresAt = $now + (int) (getenv('JWT_TTL') ?: 28800);

        $token = JWT::encode([
            'iss' => self::ISSUER,
            'sub' => $user->id,
            'role' => $user->role->kode,
            'nama' => $user->nama,
            'iat' => $now,
            'exp' => $expiresAt,
        ], self::secret(), self::ALGORITHM);

        return ['token' => $token, 'expires_at' => $expiresAt];
    }

    /**
     * Memverifikasi tanda tangan dan masa berlaku token.
     * Mengembalikan null untuk token apa pun yang tidak sah, tanpa melempar exception.
     *
     * Dipakai di: User::findIdentityByAccessToken().
     */
    public static function decode(string $token): ?stdClass
    {
        try {
            $payload = JWT::decode($token, new Key(self::secret(), self::ALGORITHM));
        } catch (Throwable) {
            return null;
        }

        return ($payload->iss ?? null) === self::ISSUER ? $payload : null;
    }

    private static function secret(): string
    {
        $secret = (string) getenv('JWT_SECRET');
        if (strlen($secret) < 32) {
            throw new RuntimeException('JWT_SECRET belum diatur atau kurang dari 32 karakter.');
        }

        return $secret;
    }
}
