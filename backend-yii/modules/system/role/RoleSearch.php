<?php

namespace app\modules\system\role;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian daftar role. Parameter query: q, page, per_page.
 *
 * Dipakai di: RoleService::list() melalui CrudService.
 */
class RoleSearch extends Model
{
    public ?string $q = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
            [['page'], 'integer', 'min' => 1],
            [['per_page'], 'integer', 'min' => 1, 'max' => 100],
        ];
    }

    public function search(): ActiveDataProvider
    {
        return new ActiveDataProvider([
            'query' => Role::findActive()
                ->andFilterWhere(['or', ['ilike', 'kode', $this->q], ['ilike', 'nama', $this->q]])
                ->orderBy(['id' => SORT_ASC]),
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
