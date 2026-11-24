/**
 * Uji chatbot bantuan tanpa LLM: pencarian basis pengetahuan lokal (exact, sinonim, typo),
 * intent router, konteks halaman, filter kategori sesuai izin role, lookup data live,
 * guard race condition, ketahanan gagal parsial, chaining aksi, ganti bahasa, dan persistensi sesi.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import i18n from '@/lib/i18n';
import { ChatbotWidget } from '@/modules/chatbot/ChatbotWidget';
import {
  KNOWLEDGE_ARTICLES,
  detectIntent,
  getSuggestedArticles,
  prioritizeTopicsByPath,
  searchKnowledge,
} from '@/modules/chatbot/knowledge';
import * as dashboardApi from '@/modules/dashboard/dashboard.api';
import * as jadwalApi from '@/modules/master/jadwal/jadwal.api';
import * as obatApi from '@/modules/master/obat/obat.api';
import * as pasienApi from '@/modules/master/pasien/pasien.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as labApi from '@/modules/transaction/lab/lab.api';
import * as pembayaranApi from '@/modules/transaction/pembayaran/pembayaran.api';
import * as pendaftaranApi from '@/modules/transaction/pendaftaran/pendaftaran.api';
import * as resepApi from '@/modules/transaction/resep/resep.api';

vi.mock('@/modules/master/pasien/pasien.api');
vi.mock('@/modules/master/jadwal/jadwal.api');
vi.mock('@/modules/master/obat/obat.api');
vi.mock('@/modules/transaction/pendaftaran/pendaftaran.api');
vi.mock('@/modules/transaction/pembayaran/pembayaran.api');
vi.mock('@/modules/transaction/resep/resep.api');
vi.mock('@/modules/transaction/lab/lab.api');
vi.mock('@/modules/dashboard/dashboard.api');

const full = { read: true, create: true, update: true, delete: true };

const userWith = (permissions: UserProfile['permissions'], id = 2): UserProfile => ({
  id,
  username: 'pendaftaran',
  nama: 'Rina Pendaftaran',
  dokter_id: null,
  role: { id: 2, kode: 'pendaftaran', nama: 'Petugas Pendaftaran' },
  modules: [],
  permissions,
});

function renderWidget(initialPath = '/dashboard') {
  const router = createMemoryRouter([{ path: '*', element: <ChatbotWidget /> }], {
    initialEntries: [initialPath],
  });
  return render(<RouterProvider router={router} />);
}

const kbText = (id: string) => ({
  title: i18n.t(`chatbot.kb.${id}.title`),
  keywords: i18n.t(`chatbot.kb.${id}.keywords`),
  answer: i18n.t(`chatbot.kb.${id}.answer`),
});

describe('searchKnowledge', () => {
  it('mengembalikan artikel paling relevan untuk pertanyaan fitur', () => {
    expect(
      searchKnowledge('bagaimana cara daftar kunjungan pasien', KNOWLEDGE_ARTICLES, kbText)[0].id,
    ).toBe('pendaftaran');
    expect(searchKnowledge('hasil lab ada di mana', KNOWLEDGE_ARTICLES, kbText)[0].id).toBe(
      'laboratorium',
    );
    expect(searchKnowledge('cetak invoice', KNOWLEDGE_ARTICLES, kbText)[0].id).toBe('billing');
  });

  it('mendukung sinonim domain rumah sakit dan toleransi typo', () => {
    expect(searchKnowledge('cetak kwitansi kasir', KNOWLEDGE_ARTICLES, kbText)[0].id).toBe(
      'billing',
    );
    expect(searchKnowledge('tebus di apotek', KNOWLEDGE_ARTICLES, kbText)[0].id).toBe('farmasi');
    expect(searchKnowledge('pembayran', KNOWLEDGE_ARTICLES, kbText)[0].id).toBe('billing');
    expect(searchKnowledge('farmasii', KNOWLEDGE_ARTICLES, kbText)[0].id).toBe('farmasi');
  });

  it('mengembalikan array kosong bila tidak ada kata yang cocok', () => {
    expect(searchKnowledge('zzzz qqqq', KNOWLEDGE_ARTICLES, kbText)).toEqual([]);
    expect(searchKnowledge('apa yang', KNOWLEDGE_ARTICLES, kbText)).toEqual([]);
  });
});

describe('detectIntent dan konteks halaman', () => {
  it('mendeteksi pola nomor SIMRS dan perintah singkat sesuai izin', () => {
    expect(detectIntent('rm000001', ['pasien', 'tagihan', 'faq'])).toEqual({
      topic: 'pasien',
      query: 'RM000001',
    });
    expect(detectIntent('INV202611001', ['pasien', 'tagihan', 'faq'])).toEqual({
      topic: 'tagihan',
      query: 'INV202611001',
    });
    expect(detectIntent('stok obat paracetamol', ['obat', 'faq'])).toEqual({
      topic: 'obat',
      query: 'paracetamol',
    });
    expect(detectIntent('jadwal hari ini', ['jadwal', 'faq'])).toEqual({
      topic: 'jadwal',
      query: 'hari ini',
    });
    // Tanpa izin pasien/tagihan, fallback ke FAQ.
    expect(detectIntent('RM000001', ['faq'])).toEqual({
      topic: 'faq',
      query: 'RM000001',
    });
  });

  it('memprioritaskan topik dan saran FAQ sesuai halaman aktif dan izin', () => {
    expect(
      prioritizeTopicsByPath('/transaction/billing', ['pasien', 'jadwal', 'tagihan', 'faq'])[0],
    ).toBe('tagihan');

    const suggested = getSuggestedArticles(
      '/transaction/billing',
      (menu) => menu === 'billing' || menu === 'dashboard',
    );
    expect(suggested[0].id).toBe('billing');
    expect(
      suggested.every((a) => a.menu === null || a.menu === 'billing' || a.menu === 'dashboard'),
    ).toBe(true);
  });
});

describe('ChatbotWidget', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    window.sessionStorage.clear();
    await i18n.changeLanguage('id');
  });

  afterEach(async () => {
    await i18n.changeLanguage('id');
  });

  it('hanya menampilkan kategori sesuai izin role', async () => {
    useAuthStore.setState({ status: 'authenticated', user: userWith({}) });
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));

    expect(screen.getByText(/Tanya fitur aplikasi/)).toBeInTheDocument();
    expect(screen.queryByText(/Cari informasi pasien/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cek status tagihan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cek jadwal praktik dokter/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cek stok dan harga obat/)).not.toBeInTheDocument();
  });

  it('kategori pasien meminta No. RM lalu menampilkan pasien dan kunjungan dari API', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: userWith({ 'master-pasien': full, antrean: full }),
    });
    vi.mocked(pasienApi.listPasien).mockResolvedValue({
      items: [
        {
          id: 1,
          no_rm: 'RM000001',
          nik: '3201010101900001',
          nama: 'Budi Santoso',
          tgl_lahir: '1990-01-01',
          jenis_kelamin: 'L',
          alamat: null,
          no_hp: null,
        },
      ],
      meta: { page: 1, per_page: 5, total: 1 },
    });
    vi.mocked(pendaftaranApi.listAntrean).mockResolvedValue({
      items: [
        {
          id: 7,
          no_kunjungan: 'RJ202611220001',
          pasien_id: 1,
          poli_id: 1,
          dokter_id: 1,
          jadwal_id: 1,
          tgl_kunjungan: '2026-11-22',
          no_antrean: 3,
          status: 'menunggu',
          pasien: null,
          poli: { id: 1, kode: 'UMUM', nama: 'Poli Umum', tarif_pendaftaran: 25000 },
          dokter: null,
        },
      ],
      meta: { page: 1, per_page: 20, total: 1 },
    });
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.click(screen.getByText(/Cari informasi pasien/));
    expect(screen.getByText(/Silakan ketik No. RM/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('No. RM / No. Registrasi'), 'RM000001');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim' }));

    expect(await screen.findByText(/RM000001 - Budi Santoso/)).toBeInTheDocument();
    expect(screen.getByText(/RJ202611220001 \| 2026-11-22/)).toBeInTheDocument();
    expect(pasienApi.listPasien).toHaveBeenCalledWith({ q: 'RM000001', per_page: 5 });
    expect(pendaftaranApi.listAntrean).toHaveBeenCalledWith({ q: 'RM000001', per_page: 5 });
    expect(pembayaranApi.listInvoice).not.toHaveBeenCalled();
  });

  it('tetap menampilkan hasil parsial saat salah satu sumber lookup pasien gagal', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: userWith({ 'master-pasien': full, antrean: full }),
    });
    vi.mocked(pasienApi.listPasien).mockResolvedValue({
      items: [
        {
          id: 1,
          no_rm: 'RM000001',
          nik: '3201010101900001',
          nama: 'Budi Santoso',
          tgl_lahir: '1990-01-01',
          jenis_kelamin: 'L',
          alamat: null,
          no_hp: null,
        },
      ],
      meta: { page: 1, per_page: 5, total: 1 },
    });
    vi.mocked(pendaftaranApi.listAntrean).mockRejectedValue(new Error('timeout'));
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.type(
      screen.getByLabelText('Ketik No. RM, No. Invoice, atau tanya fitur...'),
      'RM000001{Enter}',
    );

    expect(await screen.findByText(/RM000001 - Budi Santoso/)).toBeInTheDocument();
    expect(screen.getByText(/Sebagian sumber data gagal dimuat/)).toBeInTheDocument();
  });

  it('mendukung input langsung dari menu dan chaining Cek tagihan dari hasil pasien', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: userWith({ 'master-pasien': full, billing: full }),
    });
    vi.mocked(pasienApi.listPasien).mockResolvedValue({
      items: [
        {
          id: 1,
          no_rm: 'RM000001',
          nik: '3201010101900001',
          nama: 'Siti Aminah',
          tgl_lahir: '1992-03-10',
          jenis_kelamin: 'P',
          alamat: null,
          no_hp: null,
        },
      ],
      meta: { page: 1, per_page: 5, total: 1 },
    });
    vi.mocked(pembayaranApi.listInvoice).mockResolvedValue({
      items: [
        {
          id: 42,
          no_invoice: 'INV20261124001',
          kunjungan_id: 9,
          total: 50000,
          total_bayar: 0,
          sisa_tagihan: 50000,
          status: 'belum_dibayar',
          created_at: '2026-11-24',
          updated_at: null,
          pasien: { id: 1, no_rm: 'RM000001', nama: 'Siti Aminah', nik: '3201010101920001' },
          kunjungan: {
            id: 9,
            no_kunjungan: 'RJ202611240001',
            tgl_kunjungan: '2026-11-24',
            status: 'selesai',
            is_valid: true,
          },
          poli: { id: 1, kode: 'UMUM', nama: 'Poli Umum' },
          dokter: { id: 1, nama: 'dr. Andi' },
          items: [],
          pembayaran: [],
        },
      ],
      meta: { page: 1, per_page: 5, total: 1 },
    });
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.type(
      screen.getByLabelText('Ketik No. RM, No. Invoice, atau tanya fitur...'),
      'RM000001{Enter}',
    );

    expect(await screen.findByText(/RM000001 - Siti Aminah/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cek tagihan' }));

    expect(await screen.findByText(/INV20261124001/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lihat invoice' })).toHaveAttribute(
      'href',
      '/transaction/billing/invoice/42/cetak',
    );
  });

  it('mengabaikan respons API lama ketika user kembali ke Menu di tengah pencarian', async () => {
    useAuthStore.setState({ status: 'authenticated', user: userWith({ billing: full }) });
    let resolvePending!: (val: Awaited<ReturnType<typeof pembayaranApi.listInvoice>>) => void;
    vi.mocked(pembayaranApi.listInvoice).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePending = resolve;
        }),
    );
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.click(screen.getByText(/Cek status tagihan/));
    await userEvent.type(
      screen.getByLabelText('No. Registrasi / No. RM / No. Invoice'),
      'INV999{Enter}',
    );
    expect(screen.getByText('Mencari data...')).toBeInTheDocument();

    // Kembali ke menu sebelum promise selesai.
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByText('Pilih kategori bantuan:')).toBeInTheDocument();

    await act(async () => {
      resolvePending({ items: [], meta: { page: 1, per_page: 5, total: 0 } });
    });

    // Tetap di layar menu, pesan lama tidak masuk.
    expect(screen.getByText('Pilih kategori bantuan:')).toBeInTheDocument();
    expect(screen.queryByText(/tidak ditemukan/)).not.toBeInTheDocument();
  });

  it('lookup tanpa hasil memberi pesan tidak ditemukan', async () => {
    useAuthStore.setState({ status: 'authenticated', user: userWith({ antrean: full }) });
    vi.mocked(pendaftaranApi.listAntrean).mockResolvedValue({
      items: [],
      meta: { page: 1, per_page: 20, total: 1 },
    });
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.click(screen.getByText(/Cari informasi pasien/));
    await userEvent.type(screen.getByLabelText('No. RM / No. Registrasi'), 'RJ999{Enter}');

    expect(await screen.findByText('Data untuk "RJ999" tidak ditemukan.')).toBeInTheDocument();
    expect(pasienApi.listPasien).not.toHaveBeenCalled();
  });

  it('kategori baru obat, jadwal, farmasi, lab, dan ringkasan mengambil data dari API', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: userWith({
        'master-obat': full,
        'master-jadwal-dokter': full,
        farmasi: full,
        laboratorium: full,
        dashboard: full,
        billing: full,
      }),
    });
    vi.mocked(obatApi.listObat).mockResolvedValue({
      items: [
        {
          id: 1,
          kode: 'OBT01',
          nama: 'Paracetamol 500mg',
          satuan: 'tablet',
          harga: 1000,
          stok: 5,
          is_active: true,
        },
      ],
      meta: { page: 1, per_page: 5, total: 1 },
    });
    vi.mocked(jadwalApi.listJadwalDokter).mockResolvedValue({
      items: [
        {
          id: 1,
          dokter_id: 1,
          poli_id: 1,
          hari: 1,
          hari_nama: 'Senin',
          jam_mulai: '08:00:00',
          jam_selesai: '12:00:00',
          kuota: 20,
          is_active: true,
          dokter: { id: 1, kode: 'DR01', nama: 'dr. Andi', spesialis: 'Umum' },
          poli: { id: 1, kode: 'UMUM', nama: 'Poli Umum' },
        },
      ],
      meta: { page: 1, per_page: 5, total: 1 },
    });
    vi.mocked(resepApi.antreanFarmasi).mockResolvedValue({
      items: [
        {
          id: 10,
          no_resep: 'RSP20261124001',
          kunjungan_id: 5,
          status: 'baru',
          catatan: null,
          diserahkan_at: null,
          created_at: '2026-11-24',
          details: [],
          total: 10000,
          dokter: null,
          pasien: { id: 1, no_rm: 'RM000001', nama: 'Budi' },
          poli: { id: 1, nama: 'Poli Umum' },
        },
      ],
      meta: { page: 1, per_page: 20, total: 1 },
    });
    vi.mocked(labApi.worklistLab).mockResolvedValue({
      items: [
        {
          id: 11,
          no_order: 'LAB20261124001',
          kunjungan_id: 5,
          status: 'diminta',
          catatan_klinis: null,
          created_at: '2026-11-24',
          total: 35000,
          details: [],
          dokter: null,
          pasien: { id: 1, no_rm: 'RM000001', nama: 'Budi' },
          poli: { id: 1, nama: 'Poli Umum' },
        },
      ],
      meta: { page: 1, per_page: 20, total: 1 },
    });
    vi.mocked(dashboardApi.getSummary).mockResolvedValue({
      periode: { from: '2026-11-24', to: '2026-11-24' },
      total_kunjungan: 14,
      total_tindakan: 9,
      total_pendapatan: 750000,
      total_tagihan: 900000,
      invoice_per_status: { belum_dibayar: 2, dibayar_sebagian: 1, lunas: 8 },
    });
    vi.mocked(pembayaranApi.listBelumTagih).mockResolvedValue({
      items: [
        {
          id: 3,
          no_kunjungan: 'RJ202611240003',
          tgl_kunjungan: '2026-11-24',
          no_antrean: 3,
          status: 'selesai',
          pasien: { id: 1, no_rm: 'RM000001', nama: 'Budi' },
          poli: { id: 1, kode: 'UMUM', nama: 'Poli Umum' },
          dokter: { id: 1, nama: 'dr. Andi' },
        },
      ],
      meta: { page: 1, per_page: 1, total: 1 },
    });

    renderWidget();
    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));

    // Obat dengan penanda stok menipis
    await userEvent.click(screen.getByText(/Cek stok dan harga obat/));
    await userEvent.type(screen.getByLabelText('Nama atau kode obat'), 'Paracetamol{Enter}');
    expect(await screen.findByText(/Paracetamol 500mg/)).toBeInTheDocument();
    expect(screen.getByText(/menipis/)).toBeInTheDocument();

    // Jadwal
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByText(/Cek jadwal praktik dokter/));
    await userEvent.click(screen.getByRole('button', { name: 'Jadwal hari ini' }));
    expect(await screen.findByText(/dr. Andi/)).toBeInTheDocument();

    // Farmasi
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByText(/Cek antrean resep farmasi/));
    await userEvent.click(screen.getByRole('button', { name: 'Antrean aktif' }));
    expect(await screen.findByText(/RSP20261124001/)).toBeInTheDocument();

    // Lab
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByText(/Cek status order laboratorium/));
    await userEvent.click(screen.getByRole('button', { name: 'Order aktif' }));
    expect(await screen.findByText(/LAB20261124001/)).toBeInTheDocument();

    // Ringkasan langsung muat saat diklik
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await userEvent.click(screen.getByText(/Lihat ringkasan operasional hari ini/));
    expect(await screen.findByText(/Total kunjungan: 14/)).toBeInTheDocument();
    expect(screen.getByText(/Kunjungan belum ditagih: 1/)).toBeInTheDocument();
  });

  it('kategori FAQ menjawab dari basis pengetahuan dan tombol buka halaman mengikuti izin', async () => {
    useAuthStore.setState({ status: 'authenticated', user: userWith({ laboratorium: full }) });
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.click(screen.getByText(/Tanya fitur aplikasi/));
    await userEvent.type(
      screen.getByLabelText('Contoh: cara daftar pasien baru'),
      'input hasil lab{Enter}',
    );

    await waitFor(() => expect(screen.getAllByText('Laboratorium').length).toBeGreaterThan(0));
    expect(screen.getByRole('link', { name: 'Buka halaman' })).toHaveAttribute(
      'href',
      '/transaction/laboratorium',
    );

    await userEvent.type(
      screen.getByLabelText('Contoh: cara daftar pasien baru'),
      'cetak invoice{Enter}',
    );
    // Tanpa izin billing, artikel tetap dijawab tetapi tanpa tautan halaman.
    expect(await screen.findByText('Billing dan pembayaran')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Buka halaman' })).toHaveLength(1);
  });

  it('riwayat percakapan ikut berubah saat bahasa diganti, bertahan saat remount, dan Escape menutup dialog', async () => {
    useAuthStore.setState({ status: 'authenticated', user: userWith({ laboratorium: full }, 9) });
    const first = renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.click(screen.getByText(/Tanya fitur aplikasi/));
    await userEvent.type(
      screen.getByLabelText('Contoh: cara daftar pasien baru'),
      'input hasil lab{Enter}',
    );
    expect(await screen.findByRole('link', { name: 'Buka halaman' })).toBeInTheDocument();

    // Ganti bahasa ke EN -> riwayat yang sudah tampil ikut berubah.
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(screen.getByRole('link', { name: 'Open page' })).toBeInTheDocument();

    // Escape menutup dialog.
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Unmount & remount -> riwayat tetap tersimpan di sessionStorage.
    first.unmount();
    renderWidget();
    await userEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByRole('link', { name: 'Open page' })).toBeInTheDocument();

    // Logout membersihkan sessionStorage chatbot.
    act(() => {
      useAuthStore.getState().logout();
    });
    expect(window.sessionStorage.length).toBe(0);
  });
});
