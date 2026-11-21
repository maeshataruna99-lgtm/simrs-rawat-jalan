/**
 * Menggabungkan class Tailwind dan menyelesaikan bentrok (contoh: `px-2` dengan `px-4`).
 *
 * Dipakai di: seluruh komponen src/components/ui dan komponen App*.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
