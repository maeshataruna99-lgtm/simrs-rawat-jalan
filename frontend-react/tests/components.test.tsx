/**
 * Uji komponen aplikasi bersama (poin 2.9 & penyempurnaan UI): AppDataTable, AppSelect, dan AppEmptyState.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppDataTable, type AppColumn } from '@/components/AppDataTable';
import { AppEmptyState } from '@/components/AppEmptyState';
import { AppSelect } from '@/components/AppSelect';

interface SampleRow {
  id: number;
  kode: string;
  nama: string;
}

const columns: AppColumn<SampleRow>[] = [
  {
    key: 'kode',
    header: 'Kode',
    cell: (row) => row.kode,
    sortValue: (row) => row.kode,
  },
  {
    key: 'nama',
    header: 'Nama',
    cell: (row) => row.nama,
    sortValue: (row) => row.nama,
  },
];

const sampleRows: SampleRow[] = [
  { id: 1, kode: 'B02', nama: 'Poli Gigi' },
  { id: 2, kode: 'A01', nama: 'Poli Anak' },
];

describe('AppDataTable', () => {
  it('mengurutkan baris saat header diklik dan menampilkan kolom aksi sesuai izin', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <AppDataTable
        columns={columns}
        rows={sampleRows}
        rowKey={(r) => r.id}
        canUpdate={true}
        canDelete={false}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const sortButton = screen.getByRole('button', { name: 'Kode' });
    await userEvent.click(sortButton);

    const cells = screen.getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('A01');

    expect(screen.getAllByRole('button', { name: 'Ubah' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Ubah' })[0]);
    expect(onEdit).toHaveBeenCalledWith(sampleRows[1]);
  });
});

describe('AppSelect', () => {
  it('menjalankan pencarian ke API dan memilih opsi yang diklik', async () => {
    const onChange = vi.fn();
    const onSearch = vi.fn().mockResolvedValue([
      { value: 10, label: 'J06.9 - ISPA', description: 'Infeksi saluran pernapasan atas akut' },
      { value: 11, label: 'I10 - Hipertensi', description: 'Hipertensi esensial' },
    ]);

    render(
      <AppSelect
        ariaLabel="Pilih diagnosis"
        value={null}
        onChange={onChange}
        onSearch={onSearch}
        placeholder="Pilih diagnosis"
        searchPlaceholder="Ketik kode atau nama ICD-10..."
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Pilih diagnosis' }));
    const searchInput = await screen.findByPlaceholderText('Ketik kode atau nama ICD-10...');
    await userEvent.type(searchInput, 'J06');

    expect(onSearch).toHaveBeenCalledWith('J06');
    const option = await screen.findByRole('button', { name: /J06\.9 - ISPA/ });
    await userEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('10');
  });
});

describe('AppEmptyState', () => {
  it('menampilkan judul, deskripsi, dan aksi ketika data kosong', async () => {
    const onReset = vi.fn();

    render(
      <AppEmptyState
        title="Belum ada kunjungan"
        description="Ubah filter tanggal untuk melihat data lain."
        action={
          <button type="button" onClick={onReset}>
            Reset Filter
          </button>
        }
      />,
    );

    expect(screen.getByText('Belum ada kunjungan')).toBeInTheDocument();
    expect(screen.getByText('Ubah filter tanggal untuk melihat data lain.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset Filter' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('dipakai oleh AppDataTable saat baris kosong', () => {
    render(
      <AppDataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        emptyText="Data poli kosong"
      />,
    );
    expect(screen.getByText('Data poli kosong')).toBeInTheDocument();
  });
});
