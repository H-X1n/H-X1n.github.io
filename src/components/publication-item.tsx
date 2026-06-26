import type { Publication } from '@/data/publications';
import type { Locale } from '@/i18n';
import { text } from '@/i18n';

type PublicationItemProps = {
  publication: Publication;
  locale: Locale;
};

export function PublicationItem({ publication, locale }: PublicationItemProps) {
  const links = Object.entries(publication.links ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <article className="border-t border-line py-7 dark:border-white/10">
      <div className="grid gap-5 md:grid-cols-[9rem_1fr]">
        <div className="text-sm text-ink/55 dark:text-white/55">
          <p className="font-semibold text-coral">{publication.year}</p>
          <p className="mt-1 capitalize">{publication.type}</p>
          <p className="mt-1">{text(publication.status, locale)}</p>
        </div>
        <div>
          <h3 className="font-serif text-2xl leading-tight">{text(publication.title, locale)}</h3>
          <p className="mt-3 text-sm text-ink/62 dark:text-white/62">{publication.authors.join(', ')}</p>
          <p className="mt-1 text-sm font-medium text-teal">{publication.venue}</p>
          <p className="mt-4 leading-7 text-ink/70 dark:text-white/70">{text(publication.summary, locale)}</p>
          {links.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {links.map(([label, href]) => (
                <a key={label} href={href} className="text-sm font-medium uppercase tracking-[0.12em] text-coral hover:text-teal">
                  {label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
