/**
 * Daftar riwayat rekam medis pasien per kunjungan: tanda vital, anamnesis, pemeriksaan fisik, diagnosis, tindakan, resep, dan hasil laboratorium.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { errorMessage } from '@/lib/api-client';
import { LabHasilBadge } from '@/modules/transaction/lab/LabHasilBadge';
import * as pemeriksaanApi from './pemeriksaan.api';
import type { RiwayatMedisItem } from './pemeriksaan.types';

interface Props {
  pasienId: number;
  /** Kunjungan yang sedang dibuka, ditandai agar mudah dibedakan dari kunjungan lama. */
  currentKunjunganId?: number;
}

/**
 * Menampilkan riwayat rekam medis pasien, terbaru lebih dulu.
 *
 * Dipakai di: PemeriksaanPage (tab riwayat), RiwayatMedisPage.
 */
export function RiwayatMedisList({ pasienId, currentKunjunganId }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<RiwayatMedisItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    pemeriksaanApi
      .riwayatMedis(pasienId)
      .then((data) => active && setRows(data))
      .catch((err) => active && setError(errorMessage(err, t('common.loadFailed'))));
    return () => {
      active = false;
    };
  }, [pasienId, t]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (rows === null) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('common.emptyData')}</p>;
  }

  return (
    <div className="space-y-4">
      {rows.map(({ kunjungan, pemeriksaan, diagnosis, tindakan, resep, order_lab: orderLab }) => {
        const p = pemeriksaan;
        const ttv = p
          ? [
              p.td_sistolik !== null && `TD ${p.td_sistolik}/${p.td_diastolik ?? '-'} mmHg`,
              p.nadi !== null && `${t('transaction.pemeriksaan.nadi')} ${p.nadi}x/mnt`,
              p.suhu !== null && `${t('transaction.pemeriksaan.suhu')} ${p.suhu}°C`,
              p.respirasi !== null && `RR ${p.respirasi}x/mnt`,
              p.spo2 !== null && `SpO2 ${p.spo2}%`,
              p.berat_badan !== null && `BB ${p.berat_badan} kg`,
              p.tinggi_badan !== null && `TB ${p.tinggi_badan} cm`,
            ].filter(Boolean)
          : [];
        return (
          <Card key={kunjungan.id} data-testid="riwayat-medis-item">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">
                {kunjungan.tgl_kunjungan} · {kunjungan.poli?.nama ?? '-'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {kunjungan.id === currentKunjunganId && (
                  <Badge>{t('transaction.riwayatMedis.current')}</Badge>
                )}
                <Badge variant="outline">
                  {t(`transaction.antrean.status.${kunjungan.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {kunjungan.no_kunjungan} · {kunjungan.dokter?.nama ?? '-'}
              </p>
              {p ? (
                <>
                  <p>
                    <span className="font-medium">
                      {t('transaction.pemeriksaan.keluhanUtama')}:
                    </span>{' '}
                    {p.keluhan_utama}
                  </p>
                  {p.anamnesis && (
                    <p>
                      <span className="font-medium">{t('transaction.pemeriksaan.anamnesis')}:</span>{' '}
                      {p.anamnesis}
                    </p>
                  )}
                  {ttv.length > 0 && <p className="font-mono text-xs">{ttv.join(' · ')}</p>}
                  {p.pemeriksaan_fisik && (
                    <p>
                      <span className="font-medium">{t('transaction.pemeriksaan.fisik')}:</span>{' '}
                      {p.pemeriksaan_fisik}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">{t('transaction.riwayatMedis.notExamined')}</p>
              )}
              {tindakan.length > 0 && (
                <p>
                  <span className="font-medium">{t('transaction.tindakan.title')}:</span>{' '}
                  {tindakan.map((i) => `${i.tindakan?.nama ?? '-'} ×${i.qty}`).join(', ')}
                </p>
              )}
              {resep.length > 0 && (
                <p>
                  <span className="font-medium">{t('transaction.resep.title')}:</span>{' '}
                  {resep
                    .flatMap((r) => r.details)
                    .map(
                      (d) =>
                        `${d.obat?.nama ?? '-'} ${d.jumlah} ${d.obat?.satuan ?? ''} (${d.frekuensi})`,
                    )
                    .join(', ')}
                </p>
              )}
              {orderLab.flatMap((o) => o.details).length > 0 && (
                <div data-testid="riwayat-hasil-lab">
                  <span className="font-medium">{t('transaction.lab.title')}:</span>
                  <ul className="ml-4 list-disc">
                    {orderLab
                      .flatMap((o) => o.details)
                      .map((d) => (
                        <li key={d.id}>
                          {d.pemeriksaan?.nama}: <LabHasilBadge detail={d} />
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {diagnosis.length > 0 && (
                <ul className="space-y-1">
                  {diagnosis.map((d) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <Badge variant={d.jenis === 'utama' ? 'default' : 'secondary'}>
                        {t(`transaction.pemeriksaan.jenis.${d.jenis}`)}
                      </Badge>
                      <span className="font-mono text-xs">{d.icd10?.kode}</span>
                      <span>{d.icd10?.nama}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
