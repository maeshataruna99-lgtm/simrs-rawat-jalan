<?php

namespace app\tests\unit\common;

use app\common\JwtService;
use app\modules\system\role\Role;
use app\tests\Fixtures;
use app\tests\support\DummyController;
use app\tests\TestCase;
use Yii;
use yii\base\InvalidConfigException;
use yii\web\ForbiddenHttpException;
use yii\web\UnauthorizedHttpException;

/**
 * Uji rangkaian filter controller: token wajib, lalu izin menu per action.
 */
class AccessFilterTest extends TestCase
{
    private Role $role;

    protected function setUp(): void
    {
        parent::setUp();

        $this->role = Fixtures::role('pendaftaran', 'Pendaftaran');
        Fixtures::grant($this->role, Fixtures::menu('master-pasien'), 'RCU');
        $user = Fixtures::user($this->role, 'petugas');

        Yii::$app->request->headers->set('Authorization', 'Bearer ' . JwtService::issue($user)['token']);
    }

    private function runDummy(string $action): mixed
    {
        return (new DummyController('dummy', Yii::$app))->runAction($action);
    }

    public function testActionDenganIzinBerjalan(): void
    {
        $this->assertSame('index', $this->runDummy('index'));
        $this->assertSame('create', $this->runDummy('create'));
    }

    public function testActionTanpaIzinDibalas403(): void
    {
        $this->expectException(ForbiddenHttpException::class);
        $this->runDummy('delete');
    }

    public function testActionKhususMemakaiPemetaanController(): void
    {
        $this->assertSame('serahkan', $this->runDummy('serahkan'));
    }

    public function testActionBelumDipetakanDianggapKesalahanKonfigurasi(): void
    {
        $this->expectException(InvalidConfigException::class);
        $this->runDummy('belum-dipetakan');
    }

    public function testTanpaTokenDibalas401(): void
    {
        Yii::$app->request->headers->remove('Authorization');

        $this->expectException(UnauthorizedHttpException::class);
        $this->runDummy('index');
    }
}
