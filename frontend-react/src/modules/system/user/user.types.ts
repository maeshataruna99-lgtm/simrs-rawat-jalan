/**
 * Tipe data master pengguna (/system/user).
 */

export interface UserItem {
  id: number;
  username: string;
  nama: string;
  role_id: number;
  dokter_id: number | null;
  is_active: boolean;
  last_login_at: string | null;
  role: { id: number; kode: string; nama: string } | null;
}

export interface CreateUserPayload {
  username: string;
  nama: string;
  role_id: number;
  dokter_id: number | null;
  password: string;
  is_active: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  nama?: string;
  role_id?: number;
  dokter_id?: number | null;
  is_active?: boolean;
}
