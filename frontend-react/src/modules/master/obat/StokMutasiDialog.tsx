/**
 * Dialog riwayat mutasi stok untuk satu obat (GET /master/obat/{id}/mutasi).
 *
 * Dipakai di: ObatPage.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppFormDialog } from '@/components/AppFormDialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as obatApi from './obat.api';
import type { ObatItem, StokMutasiItem } from './obat.types';

interface Props {
  target: ObatItem | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Menampilkan tabel riwayat mutasi stok (masuk, keluar, penyesuaian) untuk satu obat.
 *
 * Dipakai di: ObatPage.
 */
export function StokMutasiDialog({ target, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StokMutasiItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target) return;
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      try {
        const data = await obatApi.listObatMutasi(target.id);
        if (active) setRows(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [target]);

  return (
    <AppFormDialog
      open={Boolean(target)}
      onOpenChange={onOpenChange}
      title={t('master.obat.historyTitle')}
      description={t('master.obat.historyDescription', { nama: target?.nama ?? '' })}
    >
      <div className="max-h-80 overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('master.obat.colWaktu')}</TableHead>
              <TableHead>{t('master.obat.colJenis')}</TableHead>
              <TableHead>{t('master.obat.colQty')}</TableHead>
              <TableHead>{t('master.obat.colSebelum')}</TableHead>
              <TableHead>{t('master.obat.colSesudah')}</TableHead>
              <TableHead>{t('master.obat.colReferensi')}</TableHead>
              <TableHead>{t('master.obat.colPetugas')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                  {t('common.emptyData')}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs">{row.created_at}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.jenis}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {row.qty > 0 ? `+${row.qty}` : row.qty}
                  </TableCell>
                  <TableCell className="font-mono">{row.stok_sebelum}</TableCell>
                  <TableCell className="font-mono font-semibold">{row.stok_sesudah}</TableCell>
                  <TableCell>{row.referensi ?? '-'}</TableCell>
                  <TableCell>{row.petugas ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppFormDialog>
  );
}
