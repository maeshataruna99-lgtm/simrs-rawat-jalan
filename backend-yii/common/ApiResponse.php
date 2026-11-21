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

        $message = is_array($data) && isset($data['message']) ? $data['message'] : $response->statusText;
        $response->data = self::error($message);
    }
}
