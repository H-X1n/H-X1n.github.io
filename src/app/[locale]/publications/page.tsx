import { PublicationsPage } from '@/features/publications-page';
import type { Locale } from '@/i18n';

export default function Page({ params }: { params: { locale: Locale } }) {
  return <PublicationsPage locale={params.locale} />;
}
