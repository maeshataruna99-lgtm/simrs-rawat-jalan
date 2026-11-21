/**
 * Tipe data master pasien (/master/pasien).
 */

export type JenisKelamin = 'L' | 'P';

export interface PasienItem {
  id: number;
  no_rm: string;
  nik: string;
  nama: string;
  tgl_lahir: string;
  jenis_kelamin: JenisKelamin;
  alamat: string | null;
  no_hp: string | null;
}

export interface PasienPayload {
  nik: string;
  nama: string;
  tgl_lahir: string;
  jenis_kelamin: JenisKelamin;
  alamat?: string | null;
  no_hp?: string | null;
}
