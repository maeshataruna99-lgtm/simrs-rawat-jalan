/**
 * Uji chatbot bantuan tanpa LLM: pencarian basis pengetahuan lokal, kategori sesuai izin role,
 * alur kategori -> input -> hasil untuk lookup pasien dan FAQ fitur.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import i18n from '@/lib/i18n';
import { ChatbotWidget } from '@/modules/chatbot/ChatbotWidget';
import { KNOWLEDGE_ARTICLES, searchKnowledge } from '@/modules/chatbot/knowledge';
import * as pasienApi from '@/modules/master/pasien/pasien.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import * as pembayaranApi from '@/modules/transaction/pembayaran/pembayaran.api';
import * as pendaftaranApi from '@/modules/transaction/pendaftaran/pendaftaran.api';

vi.mock('@/modules/master/pasien/pasien.api');
vi.mock('@/modules/transaction/pendaftaran/pendaftaran.api');
vi.mock('@/modules/transaction/pembayaran/pembayaran.api');

const full = { read: true, create: true, update: true, delete: true };

const userWith = (permissions: UserProfile['permissions']): UserProfile => ({
  id: 2,
  username: 'pendaftaran',
  nama: 'Rina Pendaftaran',
  dokter_id: null,
  role: { id: 2, kode: 'pendaftaran', nama: 'Petugas Pendaftaran' },
  modules: [],
  permissions,
});

function renderWidget() {
  const router = createMemoryRouter([{ path: '*', element: <ChatbotWidget /> }]);
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

  it('mengembalikan array kosong bila tidak ada kata yang cocok', () => {
    expect(searchKnowledge('zzzz qqqq', KNOWLEDGE_ARTICLES, kbText)).toEqual([]);
    expect(searchKnowledge('apa yang', KNOWLEDGE_ARTICLES, kbText)).toEqual([]);
  });
});

describe('ChatbotWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('hanya menampilkan kategori sesuai izin role', async () => {
    useAuthStore.setState({ status: 'authenticated', user: userWith({}) });
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));

    expect(screen.getByText(/Tanya fitur aplikasi/)).toBeInTheDocument();
    expect(screen.queryByText(/Cari informasi pasien/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cek status tagihan/)).not.toBeInTheDocument();
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
    vi.mocked(pendaftaranApi.listAntrean).mockResolvedValue([
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
    ]);
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.click(screen.getByText(/Cari informasi pasien/));
    expect(screen.getByText(/Silakan ketik No. RM/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('No. RM / No. Registrasi'), 'RM000001');
    await userEvent.click(screen.getByRole('button', { name: 'Kirim' }));

    expect(await screen.findByText(/RM000001 - Budi Santoso/)).toBeInTheDocument();
    expect(screen.getByText(/RJ202611220001 | 2026-11-22/)).toBeInTheDocument();
    expect(pasienApi.listPasien).toHaveBeenCalledWith({ q: 'RM000001', per_page: 5 });
    expect(pendaftaranApi.listAntrean).toHaveBeenCalledWith({ q: 'RM000001' });
    expect(pembayaranApi.listInvoice).not.toHaveBeenCalled();
  });

  it('lookup tanpa hasil memberi pesan tidak ditemukan', async () => {
    useAuthStore.setState({ status: 'authenticated', user: userWith({ antrean: full }) });
    vi.mocked(pendaftaranApi.listAntrean).mockResolvedValue([]);
    renderWidget();

    await userEvent.click(screen.getByRole('button', { name: 'Bantuan' }));
    await userEvent.click(screen.getByText(/Cari informasi pasien/));
    await userEvent.type(screen.getByLabelText('No. RM / No. Registrasi'), 'RJ999{Enter}');

    expect(await screen.findByText('Data untuk "RJ999" tidak ditemukan.')).toBeInTheDocument();
    expect(pasienApi.listPasien).not.toHaveBeenCalled();
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
});
