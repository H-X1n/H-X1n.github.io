import { notFound } from 'next/navigation';
import { BlogPostPage } from '@/features/blog-post-page';
import { getBlogSlugs } from '@/lib/blog';
import { locales, type Locale } from '@/i18n';

export function generateStaticParams() {
  return locales.flatMap((locale) => getBlogSlugs().map((slug) => ({ locale, slug })));
}

export default function Page({ params }: { params: { locale: Locale; slug: string } }) {
  if (!getBlogSlugs().includes(params.slug)) {
    notFound();
  }

  return <BlogPostPage locale={params.locale} slug={params.slug} />;
}
