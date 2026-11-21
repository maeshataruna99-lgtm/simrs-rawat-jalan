/**
 * Halaman riwayat rekam medis (/transaction/riwayat-medis): cari pasien lalu tampilkan seluruh kunjungannya.
 *
 * Dipakai di: routes/index.tsx.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSelect, type AppSelectOption } from '@/components/AppSelect';
import * as pemeriksaanApi from './pemeriksaan.api';
import { RiwayatMedisList } from './RiwayatMedisList';

export default function RiwayatMedisPage() {
  const { t } = useTranslation();
  const [pasienId, setPasienId] = useState<number | null>(null);

  const searchPasien = useCallback(async (q: string): Promise<AppSelectOption[]> => {
    const rows = await pemeriksaanApi.cariPasienRiwayat(q);
    return rows.map((p) => ({ value: p.id, label: p.nama, description: `${p.no_rm} · ${p.nik}` }));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('transaction.riwayatMedis.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('transaction.riwayatMedis.subtitle')}</p>
      </div>
      <div className="max-w-md">
        <AppSelect
          ariaLabel={t('transaction.riwayatMedis.choosePatient')}
          value={pasienId}
          onChange={(v) => setPasienId(v ? Number(v) : null)}
          onSearch={searchPasien}
          placeholder={t('transaction.riwayatMedis.choosePatient')}
          searchPlaceholder={t('transaction.pendaftaran.searchPlaceholder')}
        />
      </div>
      {pasienId !== null && <RiwayatMedisList key={pasienId} pasienId={pasienId} />}
    </div>
  );
}
