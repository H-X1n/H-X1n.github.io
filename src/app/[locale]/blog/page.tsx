import { BlogListPage } from '@/features/blog-list-page';
import type { Locale } from '@/i18n';

export default function Page({ params }: { params: { locale: Locale } }) {
  return <BlogListPage locale={params.locale} />;
}
