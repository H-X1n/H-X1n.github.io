import { SiteShell } from '@/components/site-shell';
import { AboutPage } from '@/features/about-page';

export default function Page() {
  return (
    <SiteShell locale="zh" rootMode currentPath="/about">
      <AboutPage locale="zh" />
    </SiteShell>
  );
}
