/**
 * Uji halaman master sistem (poin 1.13): pengguna, role, modul, menu, dan matriks hak akses role.
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as dokterApi from '@/modules/master/dokter/dokter.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as menuApi from '@/modules/system/menu/menu.api';
import * as moduleApi from '@/modules/system/module/module.api';
import * as roleAccessApi from '@/modules/system/role-access/role-access.api';
import * as roleApi from '@/modules/system/role/role.api';
import * as userApi from '@/modules/system/user/user.api';
import { renderAt } from './render';

vi.mock('@/modules/system/user/user.api');
vi.mock('@/modules/master/dokter/dokter.api');
vi.mock('@/modules/system/role/role.api');
vi.mock('@/modules/system/module/module.api');
vi.mock('@/modules/system/menu/menu.api');
vi.mock('@/modules/system/role-access/role-access.api');

const fullPerm = { read: true, create: true, update: true, delete: true };

const adminProfile: UserProfile = {
  id: 1,
  username: 'admin',
  nama: 'Administrator',
  dokter_id: null,
  role: { id: 1, kode: 'admin', nama: 'Administrator' },
  modules: [],
  permissions: {
    'system-user': fullPerm,
    'system-role': fullPerm,
    'system-module': fullPerm,
    'system-menu': fullPerm,
    'system-role-access': fullPerm,
  },
};

function apiError(status: number, data: object) {
  return new AxiosError('gagal', String(status), undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

const roles = [
  { id: 1, kode: 'admin', nama: 'Administrator', keterangan: 'Mengelola sistem' },
  { id: 2, kode: 'kasir', nama: 'Kasir', keterangan: 'Tagihan' },
];

const users = [
  {
    id: 1,
    username: 'admin',
    nama: 'Administrator',
    role_id: 1,
    dokter_id: null,
    is_active: true,
    last_login_at: null,
    role: { id: 1, kode: 'admin', nama: 'Administrator' },
  },
  {
    id: 2,
    username: 'sari',
    nama: 'Sari Kasir',
    role_id: 2,
    dokter_id: null,
    is_active: true,
    last_login_at: null,
    role: { id: 2, kode: 'kasir', nama: 'Kasir' },
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-admin');
  useAuthStore.setState({ status: 'authenticated', user: adminProfile });

  vi.mocked(roleApi.listRoles).mockResolvedValue({
    items: roles,
    meta: { page: 1, per_page: 20, total: roles.length },
  });
  vi.mocked(dokterApi.listDokter).mockResolvedValue({
    items: [
      {
        id: 4,
        kode: 'DR004',
        nama: 'dr. Andi',
        sip: 'SIP/004',
        spesialis: null,
        jenis_tenaga: 'dokter',
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 100, total: 1 },
  });
  vi.mocked(userApi.listUsers).mockResolvedValue({
    items: users,
    meta: { page: 1, per_page: 20, total: users.length },
  });
  vi.mocked(moduleApi.listModules).mockResolvedValue({
    items: [
      { id: 1, kode: 'sistem', nama: 'Sistem', icon: 'settings', urutan: 1, is_active: true },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });
  vi.mocked(menuApi.listMenus).mockResolvedValue({
    items: [
      {
        id: 10,
        parent_id: null,
        module_id: 1,
        kode: 'system-user',
        nama: 'Pengguna',
        path: '/system/user',
        icon: 'user-cog',
        urutan: 1,
        is_active: true,
      },
    ],
    meta: { page: 1, per_page: 20, total: 1 },
  });
});

describe('UserPage (/system/user)', () => {
  it('menyembunyikan tombol tambah, ubah, hapus, dan reset password jika hanya berizin baca', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        ...adminProfile,
        permissions: {
          'system-user': { read: true, create: false, update: false, delete: false },
        },
      },
    });

    renderAt('/system/user');

    expect(await screen.findByText('Sari Kasir')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tambah Pengguna' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ubah' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset Password' })).not.toBeInTheDocument();
  });

  it('form tambah menyertakan password, sedangkan form ubah tidak memiliki input password', async () => {
    vi.mocked(userApi.createUser).mockResolvedValue(users[1]);
    vi.mocked(userApi.updateUser).mockResolvedValue(users[1]);

    renderAt('/system/user');
    expect(await screen.findByText('Sari Kasir')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tambah Pengguna' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Password')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Username'), 'petugas1');
    await userEvent.type(within(dialog).getByLabelText('Nama'), 'Petugas Satu');
    await userEvent.selectOptions(within(dialog).getByLabelText('Role'), '2');
    await userEvent.type(within(dialog).getByLabelText('Password'), 'rahasia123');
    await within(dialog).findByRole('option', { name: 'DR004 — dr. Andi' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Tautan dokter'), '4');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(userApi.createUser).toHaveBeenCalledWith({
      username: 'petugas1',
      nama: 'Petugas Satu',
      role_id: 2,
      dokter_id: 4,
      password: 'rahasia123',
      is_active: true,
    });

    const editButtons = await screen.findAllByRole('button', { name: 'Ubah' });
    await userEvent.click(editButtons[1]);
    const editDialog = await screen.findByRole('dialog');
    expect(within(editDialog).queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('aksi reset password dan toggle aktif memanggil endpoint yang sesuai', async () => {
    vi.mocked(userApi.resetUserPassword).mockResolvedValue();
    vi.mocked(userApi.updateUser).mockResolvedValue({ ...users[1], is_active: false });

    renderAt('/system/user');
    expect(await screen.findByText('Sari Kasir')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: 'Status aktif sari' }));
    expect(userApi.updateUser).toHaveBeenCalledWith(2, { is_active: false });

    const resetButtons = screen.getAllByRole('button', { name: 'Reset Password' });
    await userEvent.click(resetButtons[1]);

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Password baru'), 'baru12345');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    expect(userApi.resetUserPassword).toHaveBeenCalledWith(2, 'baru12345');
  });
});

describe('RolePage, ModulePage, MenuPage', () => {
  it('menampilkan daftar role, modul, dan menu', async () => {
    renderAt('/system/role');
    expect(await screen.findByText('Mengelola sistem')).toBeInTheDocument();

    renderAt('/system/module');
    expect(await screen.findByText('Sistem')).toBeInTheDocument();

    renderAt('/system/menu');
    expect(await screen.findByText('/system/user')).toBeInTheDocument();
  });
});

describe('RoleAccessPage (/system/role-access)', () => {
  const sampleMatrix = {
    role: { id: 1, kode: 'admin', nama: 'Administrator' },
    modules: [
      {
        id: 1,
        kode: 'sistem',
        nama: 'Sistem',
        menus: [
          {
            id: 21,
            parent_id: null,
            kode: 'system-role-access',
            nama: 'Hak Akses Role',
            can_read: true,
            can_create: true,
            can_update: true,
            can_delete: true,
          },
        ],
      },
    ],
  };

  it('memuat matriks centang, mengirim PUT { access }, dan menampilkan pesan 422 dari server', async () => {
    vi.mocked(roleAccessApi.fetchRoleAccess).mockResolvedValue(sampleMatrix);
    vi.mocked(roleAccessApi.saveRoleAccess).mockRejectedValue(
      apiError(422, {
        success: false,
        message: 'Perubahan ditolak.',
        errors: {
          access: ['Akses ubah "Hak Akses Role" tidak boleh dicabut dari role Anda sendiri.'],
        },
      }),
    );

    renderAt('/system/role-access');

    const updateCheckbox = await screen.findByRole('checkbox', {
      name: 'Hak Akses Role - Ubah',
    });
    expect(updateCheckbox).toBeChecked();

    await userEvent.click(updateCheckbox);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(roleAccessApi.saveRoleAccess).toHaveBeenCalledWith(1, [
      {
        menu_id: 21,
        can_read: true,
        can_create: true,
        can_update: false,
        can_delete: true,
      },
    ]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Akses ubah "Hak Akses Role" tidak boleh dicabut dari role Anda sendiri.',
    );
  });
});
