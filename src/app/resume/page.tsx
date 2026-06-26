import { SiteShell } from '@/components/site-shell';
import { ResumePage } from '@/features/resume-page';

export default function Page() {
  return (
    <SiteShell locale="zh" rootMode currentPath="/resume">
      <ResumePage locale="zh" />
    </SiteShell>
  );
}
