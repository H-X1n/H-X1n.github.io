import { ContactPage } from '@/features/contact-page';
import type { Locale } from '@/i18n';

export default function Page({ params }: { params: { locale: Locale } }) {
  return <ContactPage locale={params.locale} />;
}
