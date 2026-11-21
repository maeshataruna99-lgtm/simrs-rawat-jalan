<?php

namespace app\modules\master\tindakan;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar tindakan medis berdasarkan kode, nama, dan poli.
 *
 * Dipakai di: TindakanService::list() melalui CrudService.
 */
class TindakanSearch extends Model
{
    public ?string $q = null;
    public $poli_id = null;
    public $is_active = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
            [['poli_id'], 'integer'],
            [['is_active'], 'boolean'],
            [['page'], 'integer', 'min' => 1],
            [['per_page'], 'integer', 'min' => 1, 'max' => 100],
        ];
    }

    public function search(): ActiveDataProvider
    {
        $query = Tindakan::findActive()
            ->with(['poli'])
            ->andFilterWhere(['or', ['ilike', 'kode', $this->q], ['ilike', 'nama', $this->q]])
            ->andFilterWhere(['poli_id' => $this->poli_id])
            ->andFilterWhere(['is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['kode' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
