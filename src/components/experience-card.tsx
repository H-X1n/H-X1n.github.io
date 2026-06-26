import Image from 'next/image';
import type { ExperienceItem } from '@/data/experience';
import type { Locale } from '@/i18n';
import { text } from '@/i18n';

type ExperienceCardProps = {
  item: ExperienceItem;
  locale: Locale;
  compact?: boolean;
};

const kindLabels = {
  zh: {
    project: '项目',
    internship: '实习',
    research: '科研',
  },
  en: {
    project: 'Project',
    internship: 'Internship',
    research: 'Research',
  },
};

export function ExperienceCard({ item, locale, compact = false }: ExperienceCardProps) {
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-line bg-white/92 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.04] md:rounded-none">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-coral/20 via-line to-teal/20 sm:aspect-[16/10]">
        <Image
          src={item.image}
          alt=""
          fill
          sizes="(min-width: 768px) 40vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.16em] text-ink/50 dark:text-white/50">
          <span>{kindLabels[locale][item.kind]}</span>
          <span>{item.period}</span>
        </div>
        <p className="text-sm font-medium text-teal">{text(item.organization, locale)}</p>
        <h3 className="mt-2 font-serif text-[1.7rem] leading-tight sm:text-2xl">{text(item.title, locale)}</h3>
        <p className="mt-4 leading-7 text-ink/68 dark:text-white/68">{text(item.summary, locale)}</p>
        {!compact ? (
          <ul className="mt-5 space-y-3 text-sm leading-6 text-ink/70 dark:text-white/70">
            {item.highlights.map((highlight) => (
              <li key={text(highlight, locale)} className="border-l-2 border-coral/70 pl-3">
                {text(highlight, locale)}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {item.tech.map((tech) => (
            <span key={tech} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs dark:bg-white/10">
              {tech}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
