<?php

namespace app\modules\master\pasien;

use yii\base\Model;
use yii\data\ActiveDataProvider;

/**
 * Pencarian dan filter daftar pasien berdasarkan nomor RM, NIK, atau nama.
 *
 * Dipakai di: PasienService::list() melalui CrudService.
 */
class PasienSearch extends Model
{
    public ?string $q = null;
    public ?string $jenis_kelamin = null;
    public int $page = 1;
    public int $per_page = 20;

    public function rules(): array
    {
        return [
            [['q'], 'string', 'max' => 100],
            [['jenis_kelamin'], 'in', 'range' => ['L', 'P']],
            [['page'], 'integer', 'min' => 1],
            [['per_page'], 'integer', 'min' => 1, 'max' => 100],
        ];
    }

    public function search(): ActiveDataProvider
    {
        $query = Pasien::findActive()
            ->andFilterWhere([
                'or',
                ['ilike', 'no_rm', $this->q],
                ['ilike', 'nik', $this->q],
                ['ilike', 'nama', $this->q],
            ])
            ->andFilterWhere(['jenis_kelamin' => $this->jenis_kelamin])
            ->orderBy(['id' => SORT_DESC]);

        return new ActiveDataProvider([
            'query' => $query,
            'pagination' => ['page' => $this->page - 1, 'pageSize' => $this->per_page],
        ]);
    }
}
