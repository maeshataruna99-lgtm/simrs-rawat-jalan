/**
 * Input rentang tanggal kunjungan (dari s/d sampai) untuk filter daftar transaksi.
 *
 * Dipakai di: AntreanPage, WorklistPage, LaboratoriumPage, FarmasiPage.
 */
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';

interface Props {
  dari: string;
  sampai: string;
  onChange: (range: { tanggal_dari: string; tanggal_sampai: string }) => void;
}

/**
 * Dua input tanggal; mengubah salah satu mengirim rentang lengkap ke induk.
 *
 * Dipakai di: halaman daftar transaksi.
 */
export function AppDateRange({ dari, sampai, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        className="w-40"
        aria-label={t('common.dateFrom')}
        value={dari}
        max={sampai || undefined}
        onChange={(e) => onChange({ tanggal_dari: e.target.value, tanggal_sampai: sampai })}
      />
      <span className="text-sm text-muted-foreground">{t('common.dateTo')}</span>
      <Input
        type="date"
        className="w-40"
        aria-label={t('common.dateUntil')}
        value={sampai}
        min={dari || undefined}
        onChange={(e) => onChange({ tanggal_dari: dari, tanggal_sampai: e.target.value })}
      />
    </div>
  );
}
