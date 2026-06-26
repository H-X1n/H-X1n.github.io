import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { isLocale, locales, type Locale } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }

  return <SiteShell locale={params.locale as Locale}>{children}</SiteShell>;
}
