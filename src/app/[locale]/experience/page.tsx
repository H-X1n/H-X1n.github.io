import { ExperiencePage } from '@/features/experience-page';
import type { Locale } from '@/i18n';

export default function Page({ params }: { params: { locale: Locale } }) {
  return <ExperiencePage locale={params.locale} />;
}
