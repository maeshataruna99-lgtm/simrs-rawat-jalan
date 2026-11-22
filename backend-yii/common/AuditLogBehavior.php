<?php

namespace app\common;

use yii\base\Behavior;
use yii\base\Event;
use yii\db\AfterSaveEvent;
use yii\db\BaseActiveRecord;

/**
 * Behavior ActiveRecord untuk mencatat otomatis insert, update, dan delete ke t_audit_log (D.4).
 *
 * Dipakai di: Pemeriksaan, TindakanKunjungan, Resep, OrderLab, Invoice, InvoiceItem.
 */
class AuditLogBehavior extends Behavior
{
    /** Kolom audit teknis yang tidak perlu dicatat sebagai perubahan bisnis. */
    private const IGNORED_ATTRIBUTES = ['created_at', 'updated_at', 'created_by', 'updated_by', 'password_hash'];

    public function events(): array
    {
        return [
            BaseActiveRecord::EVENT_AFTER_INSERT => 'afterInsert',
            BaseActiveRecord::EVENT_AFTER_UPDATE => 'afterUpdate',
            BaseActiveRecord::EVENT_AFTER_DELETE => 'afterDelete',
        ];
    }

    /**
     * Mencatat snapshot data baru saat baris dibuat.
     *
     * Dipakai di: event EVENT_AFTER_INSERT ActiveRecord.
     */
    public function afterInsert(AfterSaveEvent $event): void
    {
        /** @var BaseActiveRecord $owner */
        $owner = $this->owner;
        $recordId = (int) $owner->getPrimaryKey();
        if ($recordId <= 0) {
            return;
        }

        $baru = $this->bersihkan($owner->getAttributes());
        AuditLog::catat($owner::tableName(), $recordId, 'insert', null, $baru);
    }

    /**
     * Mencatat pasangan nilai lama dan baru hanya untuk kolom bisnis yang berubah.
     *
     * Dipakai di: event EVENT_AFTER_UPDATE ActiveRecord.
     */
    public function afterUpdate(AfterSaveEvent $event): void
    {
        /** @var BaseActiveRecord $owner */
        $owner = $this->owner;
        $recordId = (int) $owner->getPrimaryKey();
        if ($recordId <= 0) {
            return;
        }

        $lama = [];
        $baru = [];
        foreach ($event->changedAttributes as $attr => $oldVal) {
            if (in_array($attr, self::IGNORED_ATTRIBUTES, true)) {
                continue;
            }
            $newVal = $owner->getAttribute($attr);
            if ($this->normalisasi($oldVal) === $this->normalisasi($newVal)) {
                continue;
            }
            $lama[$attr] = $this->normalisasi($oldVal);
            $baru[$attr] = $this->normalisasi($newVal);
        }

        if ($lama === [] && $baru === []) {
            return;
        }

        AuditLog::catat($owner::tableName(), $recordId, 'update', $lama, $baru);
    }

    /**
     * Mencatat snapshot data lama saat baris dihapus fisik.
     *
     * Dipakai di: event EVENT_AFTER_DELETE ActiveRecord.
     */
    public function afterDelete(Event $event): void
    {
        /** @var BaseActiveRecord $owner */
        $owner = $this->owner;
        $recordId = (int) $owner->getPrimaryKey();
        if ($recordId <= 0) {
            return;
        }

        $lama = $this->bersihkan($owner->getAttributes());
        AuditLog::catat($owner::tableName(), $recordId, 'delete', $lama, null);
    }

    /**
     * Menghapus kolom audit teknis dan menormalisasi nilai agar aman diserialisasi ke JSON.
     *
     * @param array<string, mixed> $attrs
     * @return array<string, mixed>
     */
    private function bersihkan(array $attrs): array
    {
        $hasil = [];
        foreach ($attrs as $k => $v) {
            if (in_array($k, self::IGNORED_ATTRIBUTES, true)) {
                continue;
            }
            $hasil[$k] = $this->normalisasi($v);
        }

        return $hasil;
    }

    private function normalisasi(mixed $val): mixed
    {
        if (is_object($val)) {
            return (string) $val;
        }

        return $val;
    }
}
