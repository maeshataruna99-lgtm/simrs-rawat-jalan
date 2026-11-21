<?php

namespace app\modules\master\obat;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar obat berdasarkan kode, nama, dan status aktif.
 *
 * Dipakai di: ObatService::list() melalui CrudService.
 */
class ObatSearch extends Model
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
        $query = Obat::findActive()
            ->andFilterWhere(['or', ['ilike', 'kode', $this->q], ['ilike', 'nama', $this->q]])
            ->andFilterWhere(['is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['nama' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
