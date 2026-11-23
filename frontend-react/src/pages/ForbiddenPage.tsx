/**
 * Halaman saat user membuka menu yang tidak diizinkan untuk role-nya.
 *
 * Dipakai di: routes/PermissionGuard.tsx.
 */
import { ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function ForbiddenPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <ShieldX className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{t('error.forbidden')}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t('error.forbiddenHint')}</p>
      <Button asChild variant="outline">
        <Link to="/">{t('common.backHome')}</Link>
      </Button>
    </div>
  );
}
