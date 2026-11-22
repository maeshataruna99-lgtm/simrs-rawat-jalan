<?php

namespace app\modules\master\dokter;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar dokter/tenaga medis berdasarkan kata kunci, jenis tenaga, dan spesialis.
 *
 * Dipakai di: DokterService::list() melalui CrudService.
 */
class DokterSearch extends Model
{
    public ?string $q = null;
    public ?string $jenis_tenaga = null;
    public ?string $spesialis = null;
    public $is_active = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q', 'spesialis'], 'string', 'max' => 100],
            [['jenis_tenaga'], 'in', 'range' => Dokter::JENIS_TENAGA],
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
        $query = Dokter::findActive()
            ->andFilterWhere([
                'or',
                ['ilike', 'kode', $this->q],
                ['ilike', 'nama', $this->q],
                ['ilike', 'sip', $this->q],
                ['ilike', 'spesialis', $this->q],
            ])
            ->andFilterWhere(['jenis_tenaga' => $this->jenis_tenaga])
            ->andFilterWhere(['ilike', 'spesialis', $this->spesialis])
            ->andFilterWhere(['is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['nama' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
