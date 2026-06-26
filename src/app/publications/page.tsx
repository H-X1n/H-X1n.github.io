import { SiteShell } from '@/components/site-shell';
import { PublicationsPage } from '@/features/publications-page';

export default function Page() {
  return (
    <SiteShell locale="zh" rootMode currentPath="/publications">
      <PublicationsPage locale="zh" />
    </SiteShell>
  );
}
