<?php

namespace app\tests\unit\system\module;

use app\common\ValidationException;
use app\modules\system\module\MenuModuleService;
use app\tests\Fixtures;
use app\tests\TestCase;
use Yii;
use yii\web\ConflictHttpException;
use yii\web\NotFoundHttpException;

/**
 * Uji CRUD master modul (sekaligus menguji CrudService dasar).
 */
class MenuModuleServiceTest extends TestCase
{
    private MenuModuleService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MenuModuleService();
    }

    public function testTambahUbahDanCari(): void
    {
        $module = $this->service->create(['kode' => 'farmasi', 'nama' => 'Farmasi', 'urutan' => 4]);
        $this->service->update($module->id, ['nama' => 'Instalasi Farmasi']);

        $result = $this->service->list(['q' => 'instalasi']);

        $this->assertSame(1, $result->getTotalCount());
        $this->assertSame('Instalasi Farmasi', $result->getModels()[0]->nama);
    }

    public function testKodeGandaDanFormatSalahDitolak(): void
    {
        $this->service->create(['kode' => 'farmasi', 'nama' => 'Farmasi']);

        try {
            $this->service->create(['kode' => 'farmasi', 'nama' => 'Lain']);
            $this->fail('Kode ganda seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertSame(['Kode sudah dipakai.'], $e->errors['kode']);
        }

        $this->expectException(ValidationException::class);
        $this->service->create(['kode' => 'Huruf Besar', 'nama' => 'X']);
    }

    public function testFieldWajibBerbahasaIndonesia(): void
    {
        try {
            $this->service->create([]);
            $this->fail('Data kosong seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertSame('Kode tidak boleh kosong.', $e->errors['kode'][0]);
        }
    }

    public function testHapusSoftDeleteDanKodeBisaDipakaiLagi(): void
    {
        $module = $this->service->create(['kode' => 'farmasi', 'nama' => 'Farmasi']);
        $this->service->delete($module->id);

        $this->assertNotNull(Yii::$app->db->createCommand('SELECT deleted_at FROM m_module WHERE id = :id', ['id' => $module->id])->queryScalar());
        $this->assertNotNull($this->service->create(['kode' => 'farmasi', 'nama' => 'Farmasi Baru'])->id);

        $this->expectException(NotFoundHttpException::class);
        $this->service->find($module->id);
    }

    public function testModulYangMasihBerisiMenuTidakBolehDihapus(): void
    {
        $module = $this->service->create(['kode' => 'farmasi', 'nama' => 'Farmasi']);
        $menuId = Fixtures::menu('farmasi');
        Yii::$app->db->createCommand()->insert('m_module_menu', ['module_id' => $module->id, 'menu_id' => $menuId])->execute();

        $this->expectException(ConflictHttpException::class);
        $this->service->delete($module->id);
    }

    public function testKolomAuditTerisiDariUserLogin(): void
    {
        $user = Fixtures::user(Fixtures::role());
        Yii::$app->user->setIdentity($user);

        $module = $this->service->create(['kode' => 'farmasi', 'nama' => 'Farmasi']);
        $row = Yii::$app->db->createCommand('SELECT created_by, updated_by FROM m_module WHERE id = :id', ['id' => $module->id])->queryOne();

        $this->assertSame($user->id, $row['created_by']);
        $this->assertSame($user->id, $row['updated_by']);
    }
}
