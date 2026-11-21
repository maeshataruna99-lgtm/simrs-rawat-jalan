/**
 * Halaman untuk URL yang tidak terdaftar di router (juga halaman modul yang belum dibuat).
 */
import { FileQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <FileQuestion className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{t('error.notFound')}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t('error.notFoundHint')}</p>
      <Button asChild variant="outline">
        <Link to="/">{t('common.backHome')}</Link>
      </Button>
    </main>
  );
}
