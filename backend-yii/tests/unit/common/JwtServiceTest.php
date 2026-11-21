<?php

namespace app\tests\unit\common;

use app\common\JwtService;
use app\tests\Fixtures;
use app\tests\TestCase;
use Firebase\JWT\JWT;

/**
 * Uji penerbitan dan verifikasi token JWT.
 */
class JwtServiceTest extends TestCase
{
    public function testTokenYangDiterbitkanBisaDiverifikasi(): void
    {
        $user = Fixtures::user(Fixtures::role('kasir', 'Kasir'), 'kasir1');

        $result = JwtService::issue($user);
        $payload = JwtService::decode($result['token']);

        $this->assertSame($user->id, $payload->sub);
        $this->assertSame('kasir', $payload->role);
        $this->assertGreaterThan(time(), $result['expires_at']);
    }

    public function testTokenYangDiubahDitolak(): void
    {
        $user = Fixtures::user(Fixtures::role());
        $token = JwtService::issue($user)['token'];

        $this->assertNull(JwtService::decode($token . 'x'));
    }

    public function testTokenKedaluwarsaDitolak(): void
    {
        $token = JWT::encode(
            ['iss' => 'simrs-backend', 'sub' => 1, 'iat' => time() - 7200, 'exp' => time() - 3600],
            getenv('JWT_SECRET'),
            'HS256'
        );

        $this->assertNull(JwtService::decode($token));
    }

    public function testTokenDenganSecretLainDitolak(): void
    {
        $token = JWT::encode(
            ['iss' => 'simrs-backend', 'sub' => 1, 'exp' => time() + 3600],
            str_repeat('secret-lain-', 4),
            'HS256'
        );

        $this->assertNull(JwtService::decode($token));
    }
}
