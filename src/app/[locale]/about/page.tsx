import { AboutPage } from '@/features/about-page';
import type { Locale } from '@/i18n';

export default function Page({ params }: { params: { locale: Locale } }) {
  return <AboutPage locale={params.locale} />;
}
