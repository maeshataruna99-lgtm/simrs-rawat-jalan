/**
 * Input nominal mata uang Rupiah.
 *
 * Dipakai di: PoliForm, TindakanForm, PemeriksaanLabForm, ObatForm.
 */
import { Input } from '@/components/ui/input';

interface Props {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Menampilkan input angka nominal Rupiah dengan awalan Rp.
 *
 * Dipakai di: PoliForm, TindakanForm, PemeriksaanLabForm, ObatForm.
 */
export function AppCurrencyInput({ id, value, onChange, placeholder, disabled = false }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        id={id}
        type="number"
        min={0}
        step="any"
        disabled={disabled}
        placeholder={placeholder ?? '0'}
        className="pl-9"
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? 0 : Number(raw));
        }}
      />
    </div>
  );
}
