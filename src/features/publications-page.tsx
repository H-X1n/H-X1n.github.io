import { PublicationItem } from '@/components/publication-item';
import { SectionHeading } from '@/components/section-heading';
import { publications } from '@/data/publications';
import { type Locale } from '@/i18n';

export function PublicationsPage({ locale }: { locale: Locale }) {
  const sorted = [...publications].sort((a, b) => b.year - a.year);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={locale === 'zh' ? '论文' : 'Publications'}
        title={locale === 'zh' ? '论文、预印本与开放材料' : 'Papers, preprints, and open materials'}
      >
        <p>
          {locale === 'zh'
            ? '每条记录支持论文、代码、DOI、arXiv 和 BibTeX 链接。'
            : 'Each record can expose paper, code, DOI, arXiv, and BibTeX links.'}
        </p>
      </SectionHeading>

      <div>
        {sorted.map((publication) => (
          <PublicationItem key={publication.id} publication={publication} locale={locale} />
        ))}
      </div>
    </section>
  );
}
