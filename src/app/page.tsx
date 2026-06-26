import { SiteShell } from '@/components/site-shell';
import { HomePage } from '@/features/home-page';

export default function Page() {
  return (
    <SiteShell locale="zh" rootMode>
      <HomePage locale="zh" rootMode />
    </SiteShell>
  );
}
