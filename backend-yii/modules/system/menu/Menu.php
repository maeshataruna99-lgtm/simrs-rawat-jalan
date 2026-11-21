<?php

namespace app\modules\system\menu;

use app\common\ActiveRecord;
use app\modules\system\module\MenuModule;
use yii\db\Query;

/**
 * Model tabel m_menu (bertingkat lewat parent_id).
 * `module_id` adalah atribut virtual: modul tempat menu tampil, disimpan di m_module_menu oleh MenuService.
 *
 * @property int $id
 * @property int|null $parent_id
 * @property string $kode
 * @property string $nama
 * @property string|null $path
 * @property string|null $icon
 * @property int $urutan
 * @property bool $is_active
 */
class Menu extends ActiveRecord
{
    public $module_id;

    public static function tableName(): string
    {
        return 'm_menu';
    }

    public function rules(): array
    {
        return [
            [['kode', 'nama', 'module_id'], 'required'],
            [['kode', 'nama', 'path', 'icon'], 'trim'],
            [['kode'], 'string', 'max' => 100],
            [['kode'], 'match', 'pattern' => '/^[a-z0-9-]+$/', 'message' => 'Kode hanya boleh huruf kecil, angka, dan tanda hubung.'],
            [['kode'], 'unique', 'filter' => ['deleted_at' => null], 'message' => 'Kode sudah dipakai.'],
            [['nama'], 'string', 'max' => 100],
            [['path'], 'string', 'max' => 200],
            [['path'], 'match', 'pattern' => '#^/#', 'message' => 'Path harus diawali tanda /.'],
            [['path'], 'default', 'value' => null],
            [['icon'], 'string', 'max' => 50],
            [['urutan'], 'integer', 'min' => 0],
            [['urutan'], 'default', 'value' => 0],
            [['is_active'], 'boolean'],
            [['is_active'], 'default', 'value' => true],
            [['module_id'], 'integer'],
            [['module_id'], 'exist', 'targetClass' => MenuModule::class, 'targetAttribute' => 'id', 'filter' => ['deleted_at' => null], 'message' => 'Modul tidak ditemukan.'],
            [['parent_id'], 'integer'],
            [['parent_id'], 'default', 'value' => null],
            [['parent_id'], 'exist', 'targetClass' => self::class, 'targetAttribute' => 'id', 'filter' => ['deleted_at' => null], 'message' => 'Menu induk tidak ditemukan.'],
            [['parent_id'], 'validateParent'],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'kode' => 'Kode', 'nama' => 'Nama', 'path' => 'Path', 'icon' => 'Ikon', 'urutan' => 'Urutan',
            'is_active' => 'Status aktif', 'module_id' => 'Modul', 'parent_id' => 'Menu induk',
        ];
    }

    /**
     * Menu induk tidak boleh dirinya sendiri atau turunannya (mencegah siklus),
     * dan harus berada di modul yang sama agar tampil di sidebar.
     */
    public function validateParent(string $attribute): void
    {
        if ($this->parent_id === null || $this->hasErrors('parent_id')) {
            return;
        }

        $current = (int) $this->parent_id;
        while ($current !== 0) {
            if (!$this->isNewRecord && $current === (int) $this->id) {
                $this->addError($attribute, 'Menu induk tidak boleh menu ini sendiri atau turunannya.');

                return;
            }
            $current = (int) (new Query())->select('parent_id')->from('m_menu')->where(['id' => $current])->scalar();
        }

        $parentModule = (new Query())->select('module_id')->from('m_module_menu')->where(['menu_id' => $this->parent_id])->scalar();
        if ($parentModule !== false && (int) $parentModule !== (int) $this->module_id) {
            $this->addError($attribute, 'Menu induk berada di modul lain.');
        }
    }

    public function afterFind(): void
    {
        parent::afterFind();
        $moduleId = (new Query())->select('module_id')->from('m_module_menu')->where(['menu_id' => $this->id])->scalar();
        $this->module_id = $moduleId === false ? null : (int) $moduleId;
    }

    public function fields(): array
    {
        return array_merge(parent::fields(), ['module_id']);
    }
}
