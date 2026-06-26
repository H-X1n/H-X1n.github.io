import { SiteShell } from '@/components/site-shell';
import { ContactPage } from '@/features/contact-page';

export default function Page() {
  return (
    <SiteShell locale="zh" rootMode currentPath="/contact">
      <ContactPage locale="zh" />
    </SiteShell>
  );
}
