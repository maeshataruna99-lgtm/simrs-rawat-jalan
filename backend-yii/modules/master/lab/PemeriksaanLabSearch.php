<?php

namespace app\modules\master\lab;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar pemeriksaan laboratorium berdasarkan kode, nama, dan status aktif.
 *
 * Dipakai di: PemeriksaanLabService::list() melalui CrudService.
 */
class PemeriksaanLabSearch extends Model
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
        $query = PemeriksaanLab::findActive()
            ->andFilterWhere(['or', ['ilike', 'kode', $this->q], ['ilike', 'nama', $this->q]])
            ->andFilterWhere(['is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['kode' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
