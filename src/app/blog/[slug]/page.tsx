import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site-shell';
import { BlogPostPage } from '@/features/blog-post-page';
import { getBlogSlugs } from '@/lib/blog';

export function generateStaticParams() {
  return getBlogSlugs().map((slug) => ({ slug }));
}

export default function Page({ params }: { params: { slug: string } }) {
  if (!getBlogSlugs().includes(params.slug)) {
    notFound();
  }

  return (
    <SiteShell locale="zh" rootMode currentPath={`/blog/${params.slug}`}>
      <BlogPostPage locale="zh" slug={params.slug} />
    </SiteShell>
  );
}
