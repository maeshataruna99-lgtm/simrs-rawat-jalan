/**
 * Panel order laboratorium di form pemeriksaan: pilih banyak pemeriksaan (tarif tampil) dan daftar order beserta hasilnya.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { formatRupiah } from '@/lib/format';
import * as masterLabApi from '@/modules/master/lab/lab.api';
import type { PemeriksaanLabItem } from '@/modules/master/lab/lab.types';
import * as labApi from './lab.api';
import type { OrderLabItem } from './lab.api';
import { LabHasilBadge } from './LabHasilBadge';

interface Props {
  kunjunganId: number;
  editable: boolean;
}

/**
 * Membuat dan menampilkan order laboratorium satu kunjungan.
 *
 * Dipakai di: PemeriksaanPage (tab laboratorium).
 */
export function OrderLabPanel({ kunjunganId, editable }: Props) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderLabItem[]>([]);
  const [master, setMaster] = useState<PemeriksaanLabItem[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setOrders(await labApi.orderPerKunjungan(kunjunganId));
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

  useEffect(() => {
    if (!editable) return;
    masterLabApi
      .listPemeriksaanLab({ per_page: 100 })
      .then((res) => setMaster(res.items.filter((i) => i.is_active)))
      .catch(() => setMaster([]));
  }, [editable]);

  const filtered = master.filter((m) =>
    `${m.kode} ${m.nama}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const total = master.filter((m) => selected.includes(m.id)).reduce((s, m) => s + m.tarif, 0);

  const toggle = (id: number, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const save = async () => {
    setSaving(true);
    try {
      await labApi.buatOrderLab({
        kunjungan_id: kunjunganId,
        catatan_klinis: catatan,
        pemeriksaan_lab_ids: selected,
      });
      setSelected([]);
      setCatatan('');
      toast.success(t('transaction.lab.orderSaved'));
      await load();
    } catch (err) {
      toast.error(
        Object.values(fieldErrors(err)).flat()[0] ?? errorMessage(err, t('common.saveFailed')),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('transaction.lab.newOrder')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              aria-label={t('transaction.lab.searchPemeriksaan')}
              placeholder={t('transaction.lab.searchPemeriksaan')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {filtered.length === 0 ? (
                <p className="p-3 text-center text-sm text-muted-foreground">
                  {t('common.emptyData')}
                </p>
              ) : (
                filtered.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <Checkbox
                      id={`lab-${m.id}`}
                      checked={selected.includes(m.id)}
                      onCheckedChange={(v) => toggle(m.id, v === true)}
                    />
                    <Label htmlFor={`lab-${m.id}`} className="flex-1 font-normal">
                      <span className="font-mono text-xs">{m.kode}</span> {m.nama}
                    </Label>
                    <span>{formatRupiah(m.tarif)}</span>
                  </div>
                ))
              )}
            </div>
            <Textarea
              aria-label={t('transaction.lab.catatanKlinis')}
              placeholder={t('transaction.lab.catatanKlinis')}
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm" data-testid="order-lab-total">
                {t('transaction.lab.totalTarif')}: {formatRupiah(total)}
              </span>
              <Button onClick={() => void save()} disabled={selected.length === 0 || saving}>
                {t('transaction.lab.saveOrder')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.emptyData')}</p>
      ) : (
        orders.map((order) => (
          <Card key={order.id} data-testid="order-lab-item">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-base">{order.no_order}</CardTitle>
              <Badge variant="outline">{t(`transaction.lab.status.${order.status}`)}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {order.details.map((d) => (
                <div key={d.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {d.pemeriksaan?.nama}
                    {d.nilai_rujukan && (
                      <span className="text-muted-foreground"> ({d.nilai_rujukan})</span>
                    )}
                  </span>
                  <LabHasilBadge detail={d} />
                </div>
              ))}
              {order.catatan_klinis && (
                <p className="text-muted-foreground">{order.catatan_klinis}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
