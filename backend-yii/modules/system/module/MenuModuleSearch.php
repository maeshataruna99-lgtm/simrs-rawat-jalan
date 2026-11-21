<?php

namespace app\modules\system\module;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar modul. Parameter query: q, is_active, page, per_page.
 *
 * Dipakai di: MenuModuleService::list() melalui CrudService.
 */
class MenuModuleSearch extends Model
{
    public ?string $q = null;
    public $is_active = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
            [['is_active'], 'boolean'],
            [['page'], 'integer', 'min' => 1],
            [['per_page'], 'integer', 'min' => 1, 'max' => 100],
        ];
    }

    public function search(): ActiveDataProvider
    {
        $query = MenuModule::findActive()
            ->andFilterWhere(['or', ['ilike', 'kode', $this->q], ['ilike', 'nama', $this->q]])
            ->andFilterWhere(['is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['urutan' => SORT_ASC, 'nama' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
