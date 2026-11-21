<?php

namespace app\tests;

use app\modules\system\access\AccessService;
use Yii;
use yii\db\Transaction;

/**
 * Dasar unit test: membuat aplikasi Yii dengan database test dan membungkus setiap test
 * dalam transaksi yang di-rollback, sehingga test tidak saling memengaruhi.
 *
 * Dipakai di: seluruh test di tests/unit.
 */
abstract class TestCase extends \PHPUnit\Framework\TestCase
{
    private ?Transaction $transaction = null;

    protected function setUp(): void
    {
        parent::setUp();

        $config = require __DIR__ . '/../config/web.php';
        new \yii\web\Application($config);
        // Biaya bcrypt minimum agar test cepat; produksi tetap memakai nilai bawaan Yii.
        Yii::$app->security->passwordHashCost = 4;
        AccessService::clearCache();

        $this->transaction = Yii::$app->db->beginTransaction();
    }

    protected function tearDown(): void
    {
        $this->transaction?->rollBack();
        Yii::$app->db->close();
        Yii::$app->errorHandler->unregister();
        Yii::$app = null;

        parent::tearDown();
    }
}
