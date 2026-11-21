/**
 * Panel tindakan medis di form pemeriksaan: pilih tindakan dari master, jumlah, tarif, subtotal, dan total.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppSelect, type AppSelectOption } from '@/components/AppSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { formatRupiah } from '@/lib/format';
import * as masterTindakanApi from '@/modules/master/tindakan/tindakan.api';
import * as tindakanApi from './tindakan.api';
import type { TindakanKunjunganItem } from './tindakan.api';

interface Props {
  kunjunganId: number;
  editable: boolean;
}

/**
 * Menampilkan dan mengelola tindakan satu kunjungan.
 *
 * Dipakai di: PemeriksaanPage (tab tindakan).
 */
export function TindakanPanel({ kunjunganId, editable }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TindakanKunjunganItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tindakanId, setTindakanId] = useState<number | null>(null);
  const [qty, setQty] = useState('1');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await tindakanApi.daftarTindakan(kunjunganId);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(errorMessage(err, t('common.loadFailed')));
    }
  }, [kunjunganId, t]);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await load();
    })();
  }, [load]);

  const searchTindakan = useCallback(async (q: string): Promise<AppSelectOption[]> => {
    const res = await masterTindakanApi.listTindakan({ q, per_page: 20 });
    return res.items
      .filter((i) => i.is_active)
      .map((i) => ({
        value: i.id,
        label: `${i.kode} — ${i.nama}`,
        description: formatRupiah(i.tarif),
      }));
  }, []);

  const add = async () => {
    if (!tindakanId) return;
    setSaving(true);
    try {
      await tindakanApi.tambahTindakan(kunjunganId, { tindakan_id: tindakanId, qty: Number(qty) });
      setTindakanId(null);
      setQty('1');
      toast.success(t('transaction.tindakan.added'));
      await load();
    } catch (err) {
      toast.error(
        Object.values(fieldErrors(err)).flat()[0] ?? errorMessage(err, t('common.saveFailed')),
      );
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (itemId: number) => {
    try {
      await tindakanApi.batalTindakan(itemId);
      toast.success(t('transaction.tindakan.cancelled'));
      await load();
    } catch (err) {
      toast.error(errorMessage(err, t('common.saveFailed')));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('transaction.tindakan.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editable && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <AppSelect
                ariaLabel={t('transaction.tindakan.choose')}
                value={tindakanId}
                onChange={(v) => setTindakanId(v ? Number(v) : null)}
                onSearch={searchTindakan}
                placeholder={t('transaction.tindakan.choose')}
              />
            </div>
            <Input
              aria-label={t('transaction.tindakan.qty')}
              className="w-24"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            <Button onClick={() => void add()} disabled={!tindakanId || saving}>
              {t('transaction.tindakan.addButton')}
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('transaction.tindakan.title')}</TableHead>
              <TableHead className="text-right">{t('transaction.tindakan.qty')}</TableHead>
              <TableHead className="text-right">{t('transaction.tindakan.tarif')}</TableHead>
              <TableHead className="text-right">{t('transaction.tindakan.subtotal')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t('common.emptyData')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className={item.status === 'batal' ? 'text-muted-foreground line-through' : ''}
                >
                  <TableCell>
                    <span className="font-mono text-xs">{item.tindakan?.kode}</span>{' '}
                    {item.tindakan?.nama}
                  </TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell className="text-right">{formatRupiah(item.tarif)}</TableCell>
                  <TableCell className="text-right">{formatRupiah(item.subtotal)}</TableCell>
                  <TableCell className="text-right">
                    {item.status === 'batal' ? (
                      <Badge variant="outline">{t('transaction.tindakan.statusBatal')}</Badge>
                    ) : (
                      editable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void cancel(item.id)}
                        >
                          {t('transaction.tindakan.cancelButton')}
                        </Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="text-right font-medium">
                {t('transaction.tindakan.total')}
              </TableCell>
              <TableCell className="text-right font-semibold" data-testid="tindakan-total">
                {formatRupiah(total)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
