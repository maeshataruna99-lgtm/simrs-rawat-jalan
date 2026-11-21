<?php

namespace app\common;

use yii\web\UnprocessableEntityHttpException;

/**
 * Validasi data gagal di service. Membawa pesan per field agar controller bisa membalas 422.
 *
 * Dipakai di: CrudService (dilempar), CrudController (ditangkap).
 */
class ValidationException extends UnprocessableEntityHttpException
{
    /**
     * @param array<string, string[]> $errors Pesan per field, contoh ['kode' => ['Kode sudah dipakai.']].
     */
    public function __construct(public readonly array $errors, string $message = 'Validasi gagal.')
    {
        parent::__construct($message);
    }
}
