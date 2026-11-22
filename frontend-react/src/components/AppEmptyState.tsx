/**
 * Komponen empty state bersama untuk tabel, grafik, dan daftar yang belum memiliki data.
 * Mendukung tema terang/gelap serta tata letak ringkas maupun penuh.
 *
 * Dipakai di: AppDataTable.tsx, DashboardCharts.tsx, tests/components.test.tsx.
 */
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Merender tampilan kosong yang informatif dan responsif.
 *
 * Dipakai di: AppDataTable.tsx, DashboardCharts.tsx.
 */
export function AppEmptyState({ title, description, action, compact = false, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-1.5 py-6' : 'gap-2.5 rounded-lg border border-dashed bg-muted/20 px-6 py-10',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
