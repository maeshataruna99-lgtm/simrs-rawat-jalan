/**
 * Uji halaman dashboard (/dashboard): kartu ringkasan, grafik, perubahan filter periode, dan tabel rincian (poin 9.4).
 */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/lib/auth-store';
import * as dashboardApi from '@/modules/dashboard/dashboard.api';
import type { UserProfile } from '@/modules/system/auth/auth.types';
import { renderAt } from './render';

vi.mock('@/modules/dashboard/dashboard.api');

const adminUser: UserProfile = {
  id: 1,
  username: 'admin',
  nama: 'Administrator',
  dokter_id: null,
  role: { id: 1, kode: 'admin', nama: 'Administrator' },
  modules: [],
  permissions: {
    dashboard: { read: true, create: true, update: true, delete: true },
    'dashboard-keuangan': { read: true, create: false, update: false, delete: false },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem('simrs_token', 'tok-admin');
  useAuthStore.setState({ status: 'authenticated', user: adminUser });

  vi.mocked(dashboardApi.getSummary)
    .mockResolvedValueOnce({
      periode: { from: '2026-10-24', to: '2026-11-22' },
      total_kunjungan: 12,
      total_tindakan: 18,
      total_pendapatan: 1500000,
      total_tagihan: 1750000,
      invoice_per_status: { belum_dibayar: 1, dibayar_sebagian: 2, lunas: 9 },
    })
    .mockResolvedValueOnce({
      periode: { from: '2026-11-01', to: '2026-11-07' },
      total_kunjungan: 3,
      total_tindakan: 4,
      total_pendapatan: 325000,
      total_tagihan: 325000,
      invoice_per_status: { belum_dibayar: 0, dibayar_sebagian: 0, lunas: 3 },
    });

  vi.mocked(dashboardApi.getFilterOptions).mockResolvedValue({
    dokter: [{ id: 2, kode: 'DR001', nama: 'dr. Budi' }],
    penjamin: ['umum', 'bpjs', 'asuransi'],
  });
  vi.mocked(dashboardApi.getKunjunganPerPoli).mockResolvedValue([
    { poli_id: 1, kode: 'POLI-UMUM', nama: 'Poli Umum', jumlah_kunjungan: 8 },
  ]);
  vi.mocked(dashboardApi.getTindakan).mockResolvedValue([
    {
      tindakan_id: 1,
      kode: 'T01',
      nama: 'Konsultasi',
      jumlah_kali: 5,
      total_qty: 5,
      total_nilai: 250000,
    },
  ]);
  vi.mocked(dashboardApi.getPendapatan).mockResolvedValue({
    periode: { from: '2026-10-24', to: '2026-11-22' },
    per_hari: [{ tanggal: '2026-11-22', jumlah_transaksi: 2, total_pendapatan: 1500000 }],
    per_sumber: [{ sumber: 'tindakan', total_nilai: 1000000 }],
  });
  vi.mocked(dashboardApi.getObat).mockResolvedValue([
    {
      obat_id: 1,
      kode: 'OB1',
      nama: 'Paracetamol',
      satuan: 'tablet',
      total_jumlah: 20,
      total_nilai: 40000,
    },
  ]);
  vi.mocked(dashboardApi.getPembayaran).mockResolvedValue({
    periode: { from: '2026-10-24', to: '2026-11-22' },
    per_status: [
      { status: 'lunas', jumlah_invoice: 9, total_tagihan: 1500000, total_bayar: 1500000 },
    ],
    per_metode: [{ metode: 'tunai', jumlah_transaksi: 6, total_bayar: 1000000 }],
  });
  vi.mocked(dashboardApi.getDetail).mockResolvedValue({
    items: [
      {
        id: 1,
        tgl_kunjungan: '2026-11-22',
        no_kunjungan: 'RJ202611220001',
        no_rm: 'RM000001',
        pasien: 'Andi Dash',
        poli: 'Poli Umum',
        dokter: 'dr. Budi',
        status: 'selesai',
      },
    ],
    meta: { page: 1, per_page: 10, total: 1 },
  });
});

describe('DashboardPage (poin 9.4)', () => {
  it('menampilkan kartu ringkasan, grafik, tabel rincian, dan memperbarui angka saat filter periode berubah', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard');

    expect(await screen.findByText('RJ202611220001')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-kunjungan')).toHaveTextContent('12');
    expect(screen.getByTestId('kpi-pendapatan')).toHaveTextContent('Rp 1.500.000');

    // Ubah filter periode dan klik Terapkan -> angka KPI berubah
    fireEvent.change(screen.getByLabelText('Dari Tanggal'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Sampai Tanggal'), { target: { value: '2026-11-07' } });
    await user.click(screen.getByRole('button', { name: 'Terapkan' }));

    await waitFor(() => {
      expect(screen.getByTestId('kpi-kunjungan')).toHaveTextContent('3');
    });
    expect(screen.getByTestId('kpi-pendapatan')).toHaveTextContent('Rp 325.000');
    expect(dashboardApi.getSummary).toHaveBeenLastCalledWith({
      from: '2026-11-01',
      to: '2026-11-07',
    });

    // Ganti tab rincian ke Pendapatan
    await user.click(screen.getByRole('tab', { name: 'Pendapatan' }));
    await waitFor(() => {
      expect(dashboardApi.getDetail).toHaveBeenLastCalledWith('pendapatan', {
        from: '2026-11-01',
        to: '2026-11-07',
        page: 1,
        per_page: 10,
      });
    });
  });
  it('beranda (/) langsung menampilkan dashboard untuk role dengan izin dashboard', async () => {
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Dashboard & Laporan' })).toBeInTheDocument();
    expect(await screen.findByText('RJ202611220001')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-kunjungan')).toHaveTextContent('12');
  });

  it('role tanpa izin dashboard-keuangan tidak melihat dan tidak meminta data pendapatan', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        ...adminUser,
        role: { id: 3, kode: 'dokter', nama: 'Dokter' },
        permissions: { dashboard: { read: true, create: false, update: false, delete: false } },
      },
    });
    renderAt('/dashboard');

    expect(await screen.findByText('RJ202611220001')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-kunjungan')).toHaveTextContent('12');
    expect(screen.queryByTestId('kpi-pendapatan')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Pendapatan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Pembayaran' })).not.toBeInTheDocument();
    expect(dashboardApi.getPendapatan).not.toHaveBeenCalled();
    expect(dashboardApi.getPembayaran).not.toHaveBeenCalled();
  });

  it('mode EN melokalisasi rentang tanggal dan badge status kunjungan tanpa kebocoran bahasa Indonesia', async () => {
    const { default: i18n } = await import('@/lib/i18n');
    await i18n.changeLanguage('en');
    try {
      renderAt('/dashboard');
      expect(await screen.findByText('RJ202611220001')).toBeInTheDocument();
      expect(screen.queryByText(/s\/d/)).not.toBeInTheDocument();
      expect(screen.getAllByText(/2026-\d{2}-\d{2} to 2026-\d{2}-\d{2}/).length).toBeGreaterThan(0);
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.queryByText('selesai')).not.toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('id');
    }
  });
});
