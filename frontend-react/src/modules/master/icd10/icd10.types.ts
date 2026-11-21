/**
 * Tipe data master diagnosis ICD-10 (/master/icd10).
 */

export interface Icd10Item {
  id: number;
  kode: string;
  nama: string;
  is_active: boolean;
}

export interface Icd10Payload {
  kode: string;
  nama: string;
  is_active: boolean;
}
