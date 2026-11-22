<?php

namespace app\modules\system\user;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian daftar user. Parameter query: q (username/nama), role_id, is_active, page, per_page.
 *
 * Dipakai di: UserService::list() melalui CrudService.
 */
class UserSearch extends Model
{
    public ?string $q = null;
    public $role_id = null;
    public $is_active = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
            [['role_id'], 'integer'],
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
        $query = User::findActive()
            ->with('role')
            ->andFilterWhere(['or', ['ilike', 'username', $this->q], ['ilike', 'nama', $this->q]])
            ->andFilterWhere(['role_id' => $this->role_id])
            ->andFilterWhere(['is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['nama' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
