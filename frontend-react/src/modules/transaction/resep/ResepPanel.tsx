/**
 * Panel resep di form pemeriksaan: susun obat (stok tersedia tampil saat memilih), simpan resep, dan daftar resep kunjungan.
 */
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AppSelect, type AppSelectOption } from '@/components/AppSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { formatRupiah } from '@/lib/format';
import * as obatApi from '@/modules/master/obat/obat.api';
import type { ObatItem } from '@/modules/master/obat/obat.types';
import * as resepApi from './resep.api';
import type { ResepItem } from './resep.api';

interface DraftRow {
  obat: ObatItem;
  dosis: string;
  frekuensi: string;
  jumlah: string;
}

interface Props {
  kunjunganId: number;
  editable: boolean;
}

/**
 * Menyusun dan menampilkan resep satu kunjungan.
 *
 * Dipakai di: PemeriksaanPage (tab resep).
 */
export function ResepPanel({ kunjunganId, editable }: Props) {
  const { t } = useTranslation();
  const [resepList, setResepList] = useState<ResepItem[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [catatan, setCatatan] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const obatCache = useRef(new Map<number, ObatItem>());

  const load = useCallback(async () => {
    try {
      setResepList(await resepApi.daftarResep(kunjunganId));
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

  const searchObat = useCallback(
    async (q: string): Promise<AppSelectOption[]> => {
      const res = await obatApi.listObat({ q, per_page: 20 });
      return res.items
        .filter((o) => o.is_active)
        .map((o) => {
          obatCache.current.set(o.id, o);
          return {
            value: o.id,
            label: `${o.kode} — ${o.nama}`,
            description: t('transaction.resep.stokInfo', {
              stok: o.stok,
              satuan: o.satuan,
              harga: formatRupiah(o.harga),
            }),
          };
        });
    },
    [t],
  );

  const addRow = (value: string) => {
    const obat = obatCache.current.get(Number(value));
    if (!obat || rows.some((r) => r.obat.id === obat.id)) return;
    setRows((prev) => [...prev, { obat, dosis: '', frekuensi: '', jumlah: '1' }]);
  };

  const updateRow = (index: number, field: 'dosis' | 'frekuensi' | 'jumlah', value: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  const save = async () => {
    setErrors([]);
    setSaving(true);
    try {
      await resepApi.buatResep({
        kunjungan_id: kunjunganId,
        catatan,
        items: rows.map((r) => ({
          obat_id: r.obat.id,
          dosis: r.dosis,
          frekuensi: r.frekuensi,
          jumlah: Number(r.jumlah),
        })),
      });
      setRows([]);
      setCatatan('');
      toast.success(t('transaction.resep.saved'));
      await load();
    } catch (err) {
      const msgs = Object.values(fieldErrors(err)).flat();
      setErrors(msgs.length > 0 ? msgs : [errorMessage(err, t('common.saveFailed'))]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('transaction.resep.newTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AppSelect
              ariaLabel={t('transaction.resep.chooseObat')}
              value={null}
              onChange={addRow}
              onSearch={searchObat}
              placeholder={t('transaction.resep.chooseObat')}
            />
            {rows.map((row, i) => (
              <div
                key={row.obat.id}
                className="grid items-end gap-2 sm:grid-cols-[1fr_8rem_8rem_6rem_auto]"
              >
                <div className="text-sm">
                  <div className="font-medium">{row.obat.nama}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('transaction.resep.stokInfo', {
                      stok: row.obat.stok,
                      satuan: row.obat.satuan,
                      harga: formatRupiah(row.obat.harga),
                    })}
                  </div>
                </div>
                <Input
                  aria-label={`${t('transaction.resep.dosis')} ${row.obat.nama}`}
                  placeholder={t('transaction.resep.dosis')}
                  value={row.dosis}
                  onChange={(e) => updateRow(i, 'dosis', e.target.value)}
                />
                <Input
                  aria-label={`${t('transaction.resep.frekuensi')} ${row.obat.nama}`}
                  placeholder={t('transaction.resep.frekuensi')}
                  value={row.frekuensi}
                  onChange={(e) => updateRow(i, 'frekuensi', e.target.value)}
                />
                <Input
                  aria-label={`${t('transaction.resep.jumlah')} ${row.obat.nama}`}
                  type="number"
                  min={1}
                  value={row.jumlah}
                  onChange={(e) => updateRow(i, 'jumlah', e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.delete')}
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {rows.length > 0 && (
              <>
                <Textarea
                  aria-label={t('transaction.resep.catatan')}
                  placeholder={t('transaction.resep.catatan')}
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
                {errors.length > 0 && (
                  <ul
                    role="alert"
                    className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {errors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => void save()} disabled={saving}>
                    {t('transaction.resep.saveButton')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {resepList.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.emptyData')}</p>
      ) : (
        resepList.map((resep) => (
          <Card key={resep.id} data-testid="resep-item">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-base">{resep.no_resep}</CardTitle>
              <Badge variant="outline">{t(`transaction.resep.status.${resep.status}`)}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {resep.details.map((d) => (
                <div key={d.id} className="flex justify-between gap-2">
                  <span>
                    {d.obat?.nama} · {d.dosis} · {d.frekuensi} · {d.jumlah} {d.obat?.satuan}
                  </span>
                  <span>{formatRupiah(d.subtotal)}</span>
                </div>
              ))}
              {resep.catatan && <p className="text-muted-foreground">{resep.catatan}</p>}
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>{t('transaction.resep.total')}</span>
                <span>{formatRupiah(resep.total)}</span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
