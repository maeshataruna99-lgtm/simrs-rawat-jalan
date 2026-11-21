/**
 * Halaman pendaftaran kunjungan rawat jalan (/transaction/pendaftaran).
 * Alur: cari/pilih pasien (atau daftar pasien baru) -> pilih tanggal & poli -> pilih jadwal dokter
 * pada hari tersebut -> simpan pendaftaran -> tampilkan tiket nomor antrean dan riwayat kunjungan pasien.
 *
 * Dipakai di: routes/index.tsx.
 */
import { Search, TicketCheck, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { errorMessage, fieldErrors } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import * as jadwalApi from '@/modules/master/jadwal/jadwal.api';
import type { JadwalDokterItem } from '@/modules/master/jadwal/jadwal.types';
import { PasienForm } from '@/modules/master/pasien/PasienForm';
import type { PasienItem } from '@/modules/master/pasien/pasien.types';
import * as poliApi from '@/modules/master/poli/poli.api';
import type { PoliItem } from '@/modules/master/poli/poli.types';
import * as pendaftaranApi from './pendaftaran.api';
import type { KunjunganItem } from './pendaftaran.types';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Mengubah tanggal YYYY-MM-DD menjadi kode hari ISO 1 (Senin) sampai 7 (Minggu). */
function getIsoDayOfWeek(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return 1;
  const jsDay = new Date(y, m - 1, d).getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export default function PendaftaranPage() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);

  const [keyword, setKeyword] = useState('');
  const [pasienResults, setPasienResults] = useState<PasienItem[]>([]);
  const [selectedPasien, setSelectedPasien] = useState<PasienItem | null>(null);
  const [pasienFormOpen, setPasienFormOpen] = useState(false);

  const [poliList, setPoliList] = useState<PoliItem[]>([]);
  const [jadwalList, setJadwalList] = useState<JadwalDokterItem[]>([]);

  const [tglKunjungan, setTglKunjungan] = useState<string>(todayIso());
  const [selectedPoliId, setSelectedPoliId] = useState<number>(0);
  const [selectedJadwalId, setSelectedJadwalId] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<KunjunganItem | null>(null);
  const [riwayat, setRiwayat] = useState<KunjunganItem[]>([]);

  useEffect(() => {
    void poliApi
      .listPoli({ per_page: 100 })
      .then((res) => setPoliList(res.items.filter((p) => p.is_active)))
      .catch(() => {});
    void jadwalApi
      .listJadwalDokter({ per_page: 100 })
      .then((res) => setJadwalList(res.items.filter((j) => j.is_active)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      try {
        const res = await pendaftaranApi.cariPasienPendaftaran(keyword);
        if (active) setPasienResults(res);
      } catch {
        if (active) setPasienResults([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [keyword]);

  const loadRiwayat = async (pasienId: number) => {
    try {
      const rows = await pendaftaranApi.riwayatKunjunganPasien(pasienId);
      setRiwayat(rows);
    } catch {
      setRiwayat([]);
    }
  };

  const handleSelectPasien = (pasien: PasienItem) => {
    setSelectedPasien(pasien);
    setServerError(null);
    void loadRiwayat(pasien.id);
  };

  const hariKunjungan = useMemo(() => getIsoDayOfWeek(tglKunjungan), [tglKunjungan]);

  const matchingJadwal = useMemo(() => {
    return jadwalList.filter(
      (j) => j.hari === hariKunjungan && (!selectedPoliId || j.poli_id === selectedPoliId),
    );
  }, [hariKunjungan, jadwalList, selectedPoliId]);

  const activeJadwalId = matchingJadwal.some((j) => j.id === selectedJadwalId)
    ? selectedJadwalId
    : (matchingJadwal[0]?.id ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!selectedPasien) {
      setServerError(t('transaction.pendaftaran.pasienRequired'));
      return;
    }
    if (!activeJadwalId) {
      setServerError(t('transaction.pendaftaran.jadwalRequired'));
      return;
    }

    setSubmitting(true);
    try {
      const created = await pendaftaranApi.daftarKunjungan({
        pasien_id: selectedPasien.id,
        jadwal_id: activeJadwalId,
        tgl_kunjungan: tglKunjungan,
      });
      setTicket(created);
      toast.success(t('transaction.pendaftaran.successToast'));
      await loadRiwayat(selectedPasien.id);
    } catch (err) {
      const fields = fieldErrors(err);
      const firstFieldError = Object.values(fields).flat()[0];
      const msg = firstFieldError ?? errorMessage(err, t('common.saveFailed'));
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('transaction.pendaftaran.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('transaction.pendaftaran.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-lg">
                {t('transaction.pendaftaran.searchPatientTitle')}
              </CardTitle>
              <CardDescription>
                {t('transaction.pendaftaran.searchPatientSubtitle')}
              </CardDescription>
            </div>
            {can('master-pasien', 'create') && (
              <Button variant="outline" size="sm" onClick={() => setPasienFormOpen(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                {t('transaction.pendaftaran.newPatientButton')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('transaction.pendaftaran.searchPlaceholder')}
                aria-label={t('transaction.pendaftaran.searchPlaceholder')}
                className="pl-9"
              />
            </div>

            <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {pasienResults.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {t('common.emptyData')}
                </p>
              ) : (
                pasienResults.map((p) => {
                  const isSelected = selectedPasien?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPasien(p)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                        isSelected ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium">{p.nama}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {p.no_rm} · {p.nik}
                        </div>
                      </div>
                      <Badge variant={isSelected ? 'default' : 'outline'}>{p.no_rm}</Badge>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('transaction.pendaftaran.formTitle')}</CardTitle>
            <CardDescription>
              {selectedPasien
                ? `${selectedPasien.no_rm} — ${selectedPasien.nama}`
                : t('transaction.pendaftaran.choosePatientHint')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="daftar-tanggal">
                    {t('transaction.pendaftaran.tglKunjungan')}
                  </Label>
                  <Input
                    id="daftar-tanggal"
                    type="date"
                    value={tglKunjungan}
                    onChange={(e) => setTglKunjungan(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daftar-poli">{t('transaction.pendaftaran.poli')}</Label>
                  <select
                    id="daftar-poli"
                    className={selectClassName}
                    value={selectedPoliId}
                    onChange={(e) => setSelectedPoliId(Number(e.target.value))}
                  >
                    <option value={0}>{t('transaction.pendaftaran.allPoli')}</option>
                    {poliList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="daftar-jadwal">{t('transaction.pendaftaran.jadwalDokter')}</Label>
                <select
                  id="daftar-jadwal"
                  className={selectClassName}
                  value={activeJadwalId}
                  onChange={(e) => setSelectedJadwalId(Number(e.target.value))}
                >
                  {matchingJadwal.length === 0 ? (
                    <option value={0}>{t('transaction.pendaftaran.noSchedule')}</option>
                  ) : (
                    matchingJadwal.map((j) => (
                      <option key={j.id} value={j.id}>
                        {`${j.dokter?.nama ?? '-'} — ${j.poli?.nama ?? '-'} (${j.jam_mulai}-${j.jam_selesai}, Kuota ${j.kuota})`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {serverError && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {serverError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || !can('pendaftaran', 'create')}
              >
                {t('transaction.pendaftaran.submitButton')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {ticket && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TicketCheck className="h-5 w-5 text-primary" />
              {t('transaction.pendaftaran.ticketTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-sm">
              <div className="font-mono text-xs text-muted-foreground">{ticket.no_kunjungan}</div>
              <div className="text-base font-semibold">
                {ticket.pasien?.nama} ({ticket.pasien?.no_rm})
              </div>
              <div className="text-muted-foreground">
                {ticket.poli?.nama} · {ticket.dokter?.nama} · {ticket.tgl_kunjungan}
              </div>
            </div>
            <div className="rounded-lg border bg-background px-5 py-3 text-center">
              <div className="text-xs uppercase text-muted-foreground">
                {t('transaction.pendaftaran.queueNumber')}
              </div>
              <div
                data-testid="ticket-no-antrean"
                className="font-mono text-3xl font-bold text-primary"
              >
                #{ticket.no_antrean}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPasien && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('transaction.pendaftaran.historyTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('transaction.pendaftaran.colNoKunjungan')}</TableHead>
                  <TableHead>{t('transaction.pendaftaran.tglKunjungan')}</TableHead>
                  <TableHead>{t('transaction.pendaftaran.poli')}</TableHead>
                  <TableHead>{t('master.jadwal.dokter')}</TableHead>
                  <TableHead>{t('transaction.pendaftaran.queueNumber')}</TableHead>
                  <TableHead>{t('system.common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riwayat.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      {t('common.emptyData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  riwayat.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.no_kunjungan}</TableCell>
                      <TableCell>{r.tgl_kunjungan}</TableCell>
                      <TableCell>{r.poli?.nama ?? '-'}</TableCell>
                      <TableCell>{r.dokter?.nama ?? '-'}</TableCell>
                      <TableCell className="font-mono font-semibold">#{r.no_antrean}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(`transaction.antrean.status.${r.status}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PasienForm
        open={pasienFormOpen}
        onOpenChange={setPasienFormOpen}
        editing={null}
        onSaved={() => {
          void pendaftaranApi.cariPasienPendaftaran(keyword).then((res) => {
            setPasienResults(res);
            if (res[0]) handleSelectPasien(res[0]);
          });
        }}
      />
    </div>
  );
}
