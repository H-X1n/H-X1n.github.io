import { SiteShell } from '@/components/site-shell';
import { ExperiencePage } from '@/features/experience-page';

export default function Page() {
  return (
    <SiteShell locale="zh" rootMode currentPath="/experience">
      <ExperiencePage locale="zh" />
    </SiteShell>
  );
}
