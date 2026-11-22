/**
 * Uji layar display antrean ruang tunggu (/display-antrean).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/components/theme-provider';
import { getAnnouncementFiles } from '@/hooks/use-queue-announcement';
import DisplayAntreanPage from '@/modules/transaction/antrean/DisplayAntreanPage';
import * as pendaftaranApi from '@/modules/transaction/pendaftaran/pendaftaran.api';

vi.mock('@/modules/transaction/pendaftaran/pendaftaran.api', async () => {
  const actual = await vi.importActual<typeof pendaftaranApi>(
    '@/modules/transaction/pendaftaran/pendaftaran.api',
  );
  return {
    ...actual,
    getDisplayAntrean: vi.fn(),
  };
});

describe('DisplayAntreanPage (/display-antrean)', () => {
  it('menampilkan nomor antrean yang sedang diperiksa, antrean berikutnya, dan filter poli', async () => {
    const mockGet = vi.mocked(pendaftaranApi.getDisplayAntrean);
    mockGet.mockResolvedValue({
      tanggal: '2026-11-22',
      updated_at: '2026-11-22T09:00:00+07:00',
      poli_list: [
        { id: 1, kode: 'UMU', nama: 'Poli Umum' },
        { id: 2, kode: 'GIG', nama: 'Poli Gigi' },
      ],
      poli: [
        {
          poli_id: 1,
          poli_kode: 'UMU',
          poli_nama: 'Poli Umum',
          sedang_diperiksa: [
            {
              id: 101,
              no_antrean: 1,
              kode_antrean: 'UMU-001',
              inisial_pasien: 'B*** S***',
              dokter_nama: 'dr. Andi Wijaya',
              status: 'diperiksa',
            },
          ],
          menunggu: [
            {
              id: 102,
              no_antrean: 2,
              kode_antrean: 'UMU-002',
              inisial_pasien: 'S*** A***',
              dokter_nama: 'dr. Andi Wijaya',
              status: 'menunggu',
            },
          ],
          total_menunggu: 1,
          total_selesai: 3,
        },
      ],
    });

    render(
      <ThemeProvider defaultTheme="light">
        <DisplayAntreanPage />
      </ThemeProvider>,
    );

    expect(await screen.findByText('UMU-001')).toBeInTheDocument();
    expect(screen.getByText('UMU-002')).toBeInTheDocument();
    expect(screen.getByText(/B\*\*\* S\*\*\*/)).toBeInTheDocument();
    expect(screen.getByText('Menunggu: 1')).toBeInTheDocument();
    expect(screen.getByText('Selesai: 3')).toBeInTheDocument();

    const selectPoli = screen.getByRole('combobox', { name: 'Poli' });
    await userEvent.selectOptions(selectPoli, '2');
    expect(mockGet).toHaveBeenLastCalledWith({ poli_id: 2 });
  });

  it('menyusun urutan file suara dari kode antrean', () => {
    expect(getAnnouncementFiles('umu-010')).toEqual([
      'Nomor-Antrian',
      'U',
      'M',
      'U',
      'Nol',
      'satu',
      'Nol',
    ]);
  });
});
