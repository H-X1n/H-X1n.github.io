import { SiteShell } from '@/components/site-shell';
import { BlogListPage } from '@/features/blog-list-page';

export default function Page() {
  return (
    <SiteShell locale="zh" rootMode currentPath="/blog">
      <BlogListPage locale="zh" rootMode />
    </SiteShell>
  );
}
