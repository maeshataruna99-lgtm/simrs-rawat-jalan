/**
 * Tampilan satu hasil laboratorium: nilai, satuan, dan flag tinggi/rendah.
 */
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { OrderLabDetailItem } from './lab.api';

/**
 * Menampilkan hasil dan flag; hasil kosong ditampilkan sebagai "belum ada hasil".
 *
 * Dipakai di: OrderLabPanel, LaboratoriumPage, RiwayatMedisList.
 */
export function LabHasilBadge({ detail }: { detail: OrderLabDetailItem }) {
  const { t } = useTranslation();
  if (detail.hasil === null) {
    return <span className="text-muted-foreground">{t('transaction.lab.noResult')}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-medium">
        {detail.hasil} {detail.satuan ?? ''}
      </span>
      {detail.flag && detail.flag !== 'normal' && (
        <Badge variant="destructive">{t(`transaction.lab.flag.${detail.flag}`)}</Badge>
      )}
    </span>
  );
}
