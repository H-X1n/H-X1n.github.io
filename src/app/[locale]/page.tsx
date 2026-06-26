import { HomePage } from '@/features/home-page';
import type { Locale } from '@/i18n';

export default function Page({ params }: { params: { locale: Locale } }) {
  return <HomePage locale={params.locale} />;
}
