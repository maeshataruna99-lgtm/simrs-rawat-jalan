<?php

namespace app\modules\system\menu;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar menu. Parameter query: q, module_id, parent_id, is_active, page, per_page.
 *
 * Dipakai di: MenuService::list() melalui CrudService.
 */
class MenuSearch extends Model
{
    public ?string $q = null;
    public $module_id = null;
    public $parent_id = null;
    public $is_active = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
            [['module_id', 'parent_id'], 'integer'],
            [['is_active'], 'filter', 'filter' => fn ($v) => match (strtolower((string) $v)) {
                'true' => '1', 'false' => '0', default => $v
            }],
            [['is_active'], 'boolean'],
            [['page'], 'integer', 'min' => 1],
            [['per_page'], 'integer', 'min' => 1, 'max' => 100],
        ];
    }

    public function search(): ActiveDataProvider
    {
        $query = Menu::findActive()
            ->andFilterWhere(['or', ['ilike', 'm_menu.kode', $this->q], ['ilike', 'm_menu.nama', $this->q]])
            ->andFilterWhere(['m_menu.parent_id' => $this->parent_id])
            ->andFilterWhere(['m_menu.is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['m_menu.urutan' => SORT_ASC, 'm_menu.nama' => SORT_ASC]);

        if ($this->module_id !== null && $this->module_id !== '') {
            $query->innerJoin('m_module_menu mm', 'mm.menu_id = m_menu.id')->andWhere(['mm.module_id' => $this->module_id]);
        }

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
