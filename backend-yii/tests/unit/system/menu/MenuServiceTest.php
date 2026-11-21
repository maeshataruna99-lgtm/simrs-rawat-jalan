<?php

namespace app\tests\unit\system\menu;

use app\common\ValidationException;
use app\modules\system\menu\MenuService;
use app\modules\system\module\MenuModuleService;
use app\tests\TestCase;
use yii\db\Query;
use yii\web\ConflictHttpException;

/**
 * Uji master menu: penempatan di modul, menu bertingkat, dan pencegahan siklus.
 */
class MenuServiceTest extends TestCase
{
    private MenuService $service;
    private int $moduleId;
    private int $otherModuleId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MenuService();
        $modules = new MenuModuleService();
        $this->moduleId = $modules->create(['kode' => 'pelayanan', 'nama' => 'Pelayanan'])->id;
        $this->otherModuleId = $modules->create(['kode' => 'billing', 'nama' => 'Billing'])->id;
    }

    private function menu(string $kode, array $extra = []): int
    {
        return $this->service->create(array_merge(['kode' => $kode, 'nama' => ucfirst($kode), 'module_id' => $this->moduleId], $extra))->id;
    }

    public function testMenuTersimpanDiModulDanBisaDipindah(): void
    {
        $id = $this->menu('pemeriksaan', ['path' => '/transaction/pemeriksaan']);
        $this->assertSame($this->moduleId, $this->service->find($id)->module_id);

        $this->service->update($id, ['module_id' => $this->otherModuleId]);

        $rows = (new Query())->from('m_module_menu')->where(['menu_id' => $id])->all();
        $this->assertCount(1, $rows);
        $this->assertSame($this->otherModuleId, $rows[0]['module_id']);
    }

    public function testFilterBerdasarkanModul(): void
    {
        $this->menu('pemeriksaan');
        $this->menu('billing', ['module_id' => $this->otherModuleId]);

        $result = $this->service->list(['module_id' => $this->otherModuleId]);

        $this->assertSame(['billing'], array_map(fn ($m) => $m->kode, $result->getModels()));
    }

    public function testMenuIndukTidakBolehTurunannyaSendiri(): void
    {
        $parent = $this->menu('grup');
        $child = $this->menu('anak', ['parent_id' => $parent]);

        try {
            $this->service->update($parent, ['parent_id' => $child]);
            $this->fail('Siklus menu seharusnya ditolak');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('parent_id', $e->errors);
        }
    }

    public function testMenuIndukHarusDiModulYangSama(): void
    {
        $parent = $this->menu('grup');

        $this->expectException(ValidationException::class);
        $this->menu('anak', ['parent_id' => $parent, 'module_id' => $this->otherModuleId]);
    }

    public function testPathHarusDiawaliGarisMiring(): void
    {
        $this->expectException(ValidationException::class);
        $this->menu('salah', ['path' => 'tanpa-garis']);
    }

    public function testMenuDenganSubMenuTidakBolehDihapus(): void
    {
        $parent = $this->menu('grup');
        $this->menu('anak', ['parent_id' => $parent]);

        $this->expectException(ConflictHttpException::class);
        $this->service->delete($parent);
    }
}
