<?php

namespace app\modules\master\jadwal;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar jadwal praktik dokter berdasarkan dokter, poli, hari, atau kata kunci.
 *
 * Dipakai di: JadwalDokterService::list() melalui CrudService.
 */
class JadwalDokterSearch extends Model
{
    public ?string $q = null;
    public $dokter_id = null;
    public $poli_id = null;
    public $hari = null;
    public $is_active = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
            [['dokter_id', 'poli_id', 'hari'], 'integer'],
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
        $query = JadwalDokter::findActive()
            ->joinWith(['dokter d', 'poli p'])
            ->andFilterWhere(['or', ['ilike', 'd.nama', $this->q], ['ilike', 'p.nama', $this->q]])
            ->andFilterWhere(['m_jadwal_dokter.dokter_id' => $this->dokter_id])
            ->andFilterWhere(['m_jadwal_dokter.poli_id' => $this->poli_id])
            ->andFilterWhere(['m_jadwal_dokter.hari' => $this->hari])
            ->andFilterWhere(['m_jadwal_dokter.is_active' => $this->is_active === null ? null : (bool) $this->is_active])
            ->orderBy(['m_jadwal_dokter.hari' => SORT_ASC, 'm_jadwal_dokter.jam_mulai' => SORT_ASC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
