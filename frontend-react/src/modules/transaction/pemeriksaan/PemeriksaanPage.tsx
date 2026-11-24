/**
 * Halaman form pemeriksaan dokter (/transaction/pemeriksaan/:kunjunganId) bertab:
 * anamnesis, tanda vital, pemeriksaan fisik, diagnosis ICD-10, tindakan, resep, order laboratorium, dan riwayat rekam medis pasien.
 *
 * Dipakai di: routes/index.tsx.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { AppSelect, type AppSelectOption } from '@/components/AppSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import * as icd10Api from '@/modules/master/icd10/icd10.api';
import * as pemeriksaanApi from './pemeriksaan.api';
import type { DiagnosisJenis, PemeriksaanData, PemeriksaanDetail } from './pemeriksaan.types';
import { RiwayatMedisList } from './RiwayatMedisList';
import { OrderLabPanel } from '@/modules/transaction/lab/OrderLabPanel';
import { ResepPanel } from '@/modules/transaction/resep/ResepPanel';
import { TindakanPanel } from '@/modules/transaction/tindakan/TindakanPanel';

const MENU = 'pemeriksaan';

/** Tab yang termasuk form anamnesis/TTV/fisik (satu tombol simpan). */
const FORM_TABS = ['anamnesis', 'ttv', 'fisik'];

/** Tanda vital: [kolom, satuan, min, max]; batas sama dengan validasi di Yii. */
const TTV_FIELDS = [
  ['td_sistolik', 'mmHg', 50, 300],
  ['td_diastolik', 'mmHg', 30, 200],
  ['nadi', 'x/mnt', 20, 250],
  ['suhu', '°C', 30, 45],
  ['respirasi', 'x/mnt', 5, 80],
  ['spo2', '%', 50, 100],
  ['berat_badan', 'kg', 0.5, 500],
  ['tinggi_badan', 'cm', 20, 250],
] as const;

type TtvKey = (typeof TTV_FIELDS)[number][0];

const rangeField = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max),
      {
        message: `transaction.pemeriksaan.rangeError|${min}|${max}`,
      },
    );

const schema = z.object({
  keluhan_utama: z.string().trim().min(1, 'transaction.pemeriksaan.keluhanRequired'),
  anamnesis: z.string(),
  pemeriksaan_fisik: z.string(),
  ...(Object.fromEntries(
    TTV_FIELDS.map(([key, , min, max]) => [key, rangeField(min, max)]),
  ) as Record<TtvKey, ReturnType<typeof rangeField>>),
});

type FormValues = z.infer<typeof schema>;

interface DiagnosisRow {
  icd10_id: number;
  kode: string;
  nama: string;
  jenis: DiagnosisJenis;
}

function toFormValues(p: PemeriksaanData | null): FormValues {
  const ttv = Object.fromEntries(
    TTV_FIELDS.map(([key]) => [
      key,
      p?.[key] === null || p?.[key] === undefined ? '' : String(p[key]),
    ]),
  ) as Record<TtvKey, string>;
  return {
    keluhan_utama: p?.keluhan_utama ?? '',
    anamnesis: p?.anamnesis ?? '',
    pemeriksaan_fisik: p?.pemeriksaan_fisik ?? '',
    ...ttv,
  };
}

export default function PemeriksaanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const kunjunganId = Number(useParams().kunjunganId);
  const can = useAuthStore((s) => s.can);

  const [detail, setDetail] = useState<PemeriksaanDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisRow[]>([]);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [tab, setTab] = useState('anamnesis');
  const icd10Options = useRef(new Map<number, string>());

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toFormValues(null) });

  // syncDiagnosis=false dipakai setelah simpan pemeriksaan: muat ulang yang datang terlambat tidak boleh menimpa diagnosis yang sedang diisi.
  const load = useCallback(
    async (syncDiagnosis = true) => {
      try {
        const data = await pemeriksaanApi.detailPemeriksaan(kunjunganId);
        setDetail(data);
        reset(toFormValues(data.pemeriksaan));
        if (!syncDiagnosis) return;
        setDiagnosis(
          data.diagnosis.map((d) => ({
            icd10_id: d.icd10_id,
            kode: d.icd10?.kode ?? '',
            nama: d.icd10?.nama ?? '',
            jenis: d.jenis,
          })),
        );
      } catch (err) {
        setLoadError(errorMessage(err, t('common.loadFailed')));
      }
    },
    [kunjunganId, reset, t],
  );

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await load();
    })();
  }, [load]);

  const kunjungan = detail?.kunjungan;
  // Kunjungan yang divalidasi kasir terkunci dari order baru sampai kasir menekan Unvalid.
  const terkunci = kunjungan?.is_valid === true;
  const editable =
    can(MENU, 'update') &&
    !terkunci &&
    (kunjungan?.status === 'menunggu' || kunjungan?.status === 'diperiksa');

  const errorText = (message?: string) => {
    if (!message) return null;
    const [key, min, max] = message.split('|');
    return t(key, { min, max, defaultValue: key });
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const payload = { ...values } as unknown as PemeriksaanData;
    TTV_FIELDS.forEach(([key]) => {
      (payload as unknown as Record<string, number | null>)[key] =
        values[key] === '' ? null : Number(values[key]);
    });
    try {
      await pemeriksaanApi.simpanPemeriksaan(kunjunganId, payload);
      toast.success(t('transaction.pemeriksaan.saved'));
      await load(false);
    } catch (err) {
      const fields = fieldErrors(err);
      Object.entries(fields).forEach(([key, msgs]) =>
        setError(key as keyof FormValues, { message: msgs[0] }),
      );
      if (Object.keys(fields).length === 0) {
        setServerError(errorMessage(err, t('common.saveFailed')));
      }
    }
  };

  const searchIcd10 = useCallback(async (q: string): Promise<AppSelectOption[]> => {
    const res = await icd10Api.listIcd10({ q, is_active: true, per_page: 20 });
    res.items.forEach((i) => icd10Options.current.set(i.id, `${i.kode}|${i.nama}`));
    return res.items.map((i) => ({ value: i.id, label: `${i.kode} — ${i.nama}` }));
  }, []);

  const addDiagnosis = (value: string) => {
    const id = Number(value);
    if (!id || diagnosis.some((d) => d.icd10_id === id)) return;
    const [kode, nama] = (icd10Options.current.get(id) ?? '|').split('|');
    setDiagnosis((rows) => [
      ...rows,
      {
        icd10_id: id,
        kode,
        nama,
        jenis: rows.some((r) => r.jenis === 'utama') ? 'sekunder' : 'utama',
      },
    ]);
  };

  const saveDiagnosis = async () => {
    setSavingDiagnosis(true);
    try {
      await pemeriksaanApi.simpanDiagnosis(
        kunjunganId,
        diagnosis.map(({ icd10_id, jenis }) => ({ icd10_id, jenis })),
      );
      toast.success(t('transaction.pemeriksaan.diagnosisSaved'));
      await load();
    } catch (err) {
      const msg =
        Object.values(fieldErrors(err)).flat()[0] ?? errorMessage(err, t('common.saveFailed'));
      toast.error(msg);
    } finally {
      setSavingDiagnosis(false);
    }
  };

  if (loadError) {
    return (
      <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {loadError}
      </p>
    );
  }
  if (!kunjungan) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  const textError = (key: keyof FormValues) =>
    errors[key] && <p className="text-sm text-destructive">{errorText(errors[key]?.message)}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate('/transaction/pemeriksaan')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t('transaction.pemeriksaan.worklistTitle')}
          </Button>
          <h1 className="text-2xl font-semibold">{kunjungan.pasien?.nama}</h1>
          <p className="text-sm text-muted-foreground">
            {kunjungan.pasien?.no_rm} · {kunjungan.no_kunjungan} · {kunjungan.poli?.nama} ·{' '}
            {kunjungan.dokter?.nama}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{t(`transaction.antrean.status.${kunjungan.status}`)}</Badge>
        </div>
      </div>

      {terkunci && kunjungan.status !== 'selesai' && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t('transaction.pemeriksaan.lockedNotice')}
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="anamnesis">{t('transaction.pemeriksaan.tabAnamnesis')}</TabsTrigger>
          <TabsTrigger value="ttv">{t('transaction.pemeriksaan.tabTtv')}</TabsTrigger>
          <TabsTrigger value="fisik">{t('transaction.pemeriksaan.tabFisik')}</TabsTrigger>
          <TabsTrigger value="diagnosis">{t('transaction.pemeriksaan.tabDiagnosis')}</TabsTrigger>
          <TabsTrigger value="tindakan">{t('transaction.tindakan.title')}</TabsTrigger>
          <TabsTrigger value="resep">{t('transaction.resep.title')}</TabsTrigger>
          <TabsTrigger value="lab">{t('transaction.lab.title')}</TabsTrigger>
          <TabsTrigger value="riwayat">{t('transaction.pemeriksaan.tabRiwayat')}</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <fieldset disabled={!editable} className="space-y-4">
            <TabsContent value="anamnesis" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="keluhan_utama">
                      {t('transaction.pemeriksaan.keluhanUtama')}
                    </Label>
                    <Textarea id="keluhan_utama" rows={2} {...register('keluhan_utama')} />
                    {textError('keluhan_utama')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anamnesis">{t('transaction.pemeriksaan.anamnesis')}</Label>
                    <Textarea id="anamnesis" rows={4} {...register('anamnesis')} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ttv" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                  {TTV_FIELDS.map(([key, unit]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>
                        {t(`transaction.pemeriksaan.${key}`)} ({unit})
                      </Label>
                      <Input id={key} inputMode="decimal" {...register(key)} />
                      {textError(key)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fisik" forceMount className="data-[state=inactive]:hidden">
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <Label htmlFor="pemeriksaan_fisik">{t('transaction.pemeriksaan.fisik')}</Label>
                  <Textarea id="pemeriksaan_fisik" rows={6} {...register('pemeriksaan_fisik')} />
                </CardContent>
              </Card>
            </TabsContent>

            {serverError && (
              <p
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </p>
            )}
            {editable && FORM_TABS.includes(tab) && (
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {t('transaction.pemeriksaan.saveButton')}
                </Button>
              </div>
            )}
          </fieldset>
        </form>

        <TabsContent value="diagnosis">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('transaction.pemeriksaan.tabDiagnosis')}</CardTitle>
              <CardDescription>{t('transaction.pemeriksaan.diagnosisHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editable && (
                <AppSelect
                  ariaLabel={t('transaction.pemeriksaan.addDiagnosis')}
                  value={null}
                  onChange={addDiagnosis}
                  onSearch={searchIcd10}
                  placeholder={t('transaction.pemeriksaan.addDiagnosis')}
                />
              )}
              {diagnosis.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('common.emptyData')}</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {diagnosis.map((d) => (
                    <li key={d.icd10_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="diagnosis-utama"
                          checked={d.jenis === 'utama'}
                          disabled={!editable}
                          onChange={() =>
                            setDiagnosis((rows) =>
                              rows.map((r) => ({
                                ...r,
                                jenis: r.icd10_id === d.icd10_id ? 'utama' : 'sekunder',
                              })),
                            )
                          }
                        />
                        {t('transaction.pemeriksaan.jenis.utama')}
                      </label>
                      <span className="font-mono text-xs">{d.kode}</span>
                      <span className="flex-1">{d.nama}</span>
                      <Badge variant={d.jenis === 'utama' ? 'default' : 'secondary'}>
                        {t(`transaction.pemeriksaan.jenis.${d.jenis}`)}
                      </Badge>
                      {editable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('common.delete')}
                          onClick={() =>
                            setDiagnosis((rows) => rows.filter((r) => r.icd10_id !== d.icd10_id))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {editable && (
                <div className="flex justify-end">
                  <Button onClick={() => void saveDiagnosis()} disabled={savingDiagnosis}>
                    {t('transaction.pemeriksaan.saveDiagnosisButton')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tindakan">
          <TindakanPanel kunjunganId={kunjungan.id} editable={editable} />
        </TabsContent>

        <TabsContent value="resep">
          <ResepPanel kunjunganId={kunjungan.id} editable={editable} />
        </TabsContent>

        <TabsContent value="lab">
          <OrderLabPanel kunjunganId={kunjungan.id} editable={editable} />
        </TabsContent>

        <TabsContent value="riwayat">
          {kunjungan.pasien && (
            <RiwayatMedisList pasienId={kunjungan.pasien.id} currentKunjunganId={kunjungan.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
