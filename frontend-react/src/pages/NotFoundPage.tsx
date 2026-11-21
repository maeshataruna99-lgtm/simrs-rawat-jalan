/**
 * Halaman untuk URL yang tidak terdaftar di router.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t('error.notFound')}</h1>
      <Link to="/">{t('common.backHome')}</Link>
    </main>
  );
}
