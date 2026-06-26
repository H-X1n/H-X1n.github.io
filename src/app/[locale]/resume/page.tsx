import { ResumePage } from '@/features/resume-page';
import type { Locale } from '@/i18n';

export default function Page({ params }: { params: { locale: Locale } }) {
  return <ResumePage locale={params.locale} />;
}
