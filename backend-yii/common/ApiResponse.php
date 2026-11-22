<?php

namespace app\common;

use yii\base\Event;
use yii\web\Response;

/**
 * Pembentuk format response API yang seragam (CONTRIBUTING.md bagian 8).
 */
class ApiResponse
{
    /**
     * Membungkus data sukses.
     *
     * Dipakai di: seluruh controller API.
     */
    public static function success(mixed $data = null, string $message = 'OK', ?array $meta = null): array
    {
        $body = ['success' => true, 'message' => $message, 'data' => $data];
        if ($meta !== null) {
            $body['meta'] = $meta;
        }

        return $body;
    }

    /**
     * Membungkus data gagal. `errors` berisi pesan per field untuk validasi.
     *
     * Dipakai di: controller API dan normalizeError().
     */
    public static function error(string $message, ?array $errors = null): array
    {
        $body = ['success' => false, 'message' => $message];
        if ($errors !== null) {
            $body['errors'] = $errors;
        }

        return $body;
    }

    /**
     * Mengubah response error bawaan Yii (exception, 404, 401) ke format seragam.
     * Response yang sudah berformat seragam tidak diubah.
     *
     * Dipakai di: config/web.php (event beforeSend komponen response).
     */
    public static function normalizeError(Event $event): void
    {
        /** @var Response $response */
        $response = $event->sender;
        $data = $response->data;

        if ($response->isSuccessful || (is_array($data) && array_key_exists('success', $data))) {
            return;
        }

        // Pelanggaran UNIQUE (SQLSTATE 23505) dari request kembar yang lolos validasi bersamaan:
        // data aman ditahan constraint DB, jadi balas 409 alih-alih 500.
        $exception = \Yii::$app->has('errorHandler') ? \Yii::$app->errorHandler->exception : null;
        if ($exception instanceof \yii\db\IntegrityException && ($exception->errorInfo[0] ?? null) === '23505') {
            $response->setStatusCode(409);
            $response->data = self::error('Data yang sama baru saja disimpan oleh transaksi lain. Muat ulang lalu periksa kembali.');

            return;
        }

        $message = is_array($data) && isset($data['message']) ? $data['message'] : $response->statusText;
        $response->data = self::error($message);
    }
}
