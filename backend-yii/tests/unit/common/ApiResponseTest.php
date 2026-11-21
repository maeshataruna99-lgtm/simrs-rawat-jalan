<?php

namespace app\tests\unit\common;

use app\common\ApiResponse;
use app\tests\TestCase;
use Yii;

/**
 * Uji format response seragam dan koneksi ke database test.
 */
class ApiResponseTest extends TestCase
{
    public function testSuccessTanpaMeta(): void
    {
        $this->assertSame(
            ['success' => true, 'message' => 'OK', 'data' => ['id' => 1]],
            ApiResponse::success(['id' => 1])
        );
    }

    public function testSuccessDenganMeta(): void
    {
        $body = ApiResponse::success([], 'OK', ['page' => 1, 'per_page' => 20, 'total' => 0]);

        $this->assertSame(['page' => 1, 'per_page' => 20, 'total' => 0], $body['meta']);
    }

    public function testErrorDenganDetailField(): void
    {
        $this->assertSame(
            ['success' => false, 'message' => 'Validasi gagal', 'errors' => ['nik' => ['NIK wajib diisi']]],
            ApiResponse::error('Validasi gagal', ['nik' => ['NIK wajib diisi']])
        );
    }

    public function testMemakaiDatabaseTest(): void
    {
        $this->assertSame('simrs_test', Yii::$app->db->createCommand('SELECT current_database()')->queryScalar());
    }
}
