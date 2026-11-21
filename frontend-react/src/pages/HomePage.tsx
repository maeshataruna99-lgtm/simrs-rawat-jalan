/**
 * Halaman beranda sementara. Diganti dashboard sesuai role di poin 1.11.
 */
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  );
}
