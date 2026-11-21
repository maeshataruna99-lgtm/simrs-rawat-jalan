/**
 * Halaman beranda sementara. Diganti dashboard sesuai role di poin 1.11.
 */
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold">{t('app.name')}</h1>
      <p className="text-muted-foreground">{t('app.tagline')}</p>
    </main>
  );
}
