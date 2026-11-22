<?php

namespace app\modules\master\icd10;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian daftar ICD-10 berdasarkan kode atau nama diagnosis (parameter `q`).
 *
 * Dipakai di: Icd10Service::list() melalui CrudService.
 */
class Icd10Search extends Model
{
    public ?string $q = null;
    public $is_active = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
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
        $query = Icd10::findActive()
            ->andFilterWhere(['or', ['ilike', 'kode', $this->q], ['ilike', 'nama', $this->q]])
            ->andFilterWhere(['is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['kode' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
