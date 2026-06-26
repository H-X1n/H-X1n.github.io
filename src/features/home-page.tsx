import Image from 'next/image';
import Link from 'next/link';
import { ExperienceCard } from '@/components/experience-card';
import { PublicationItem } from '@/components/publication-item';
import { SectionHeading } from '@/components/section-heading';
import { experiences } from '@/data/experience';
import { interests } from '@/data/interests';
import { profile } from '@/data/profile';
import { publications } from '@/data/publications';
import { dictionary, text, type Locale } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getAllPosts } from '@/lib/blog';
import { localizedPath } from '@/lib/routes';

type HomePageProps = {
  locale: Locale;
  rootMode?: boolean;
};

export function HomePage({ locale, rootMode = false }: HomePageProps) {
  const copy = dictionary[locale];
  const featuredExperiences = experiences.filter((item) => item.featured).slice(0, 2);
  const featuredPublications = publications.filter((item) => item.featured).slice(0, 2);
  const posts = getAllPosts().slice(0, 2);

  return (
    <>
      <section className="relative isolate mx-auto grid max-w-7xl gap-8 px-5 pb-16 pt-10 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-8 md:pb-24 md:pt-20">
        <div className="pointer-events-none absolute inset-x-6 top-8 -z-10 h-56 rounded-full bg-gradient-to-r from-coral/20 via-violet/15 to-teal/15 blur-3xl md:hidden" />
        <div className="flex flex-col justify-center">
          <p className="font-accent text-xl text-coral">{copy.introLabel}</p>
          <h1 className="mt-5 break-words font-serif text-5xl leading-[0.96] sm:text-6xl md:mt-6 md:text-8xl">
            {text(profile.name, locale)}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/72 dark:text-white/72 md:mt-6 md:text-xl md:leading-9">
            {text(profile.headline, locale)}
          </p>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/68 dark:text-white/68 md:mt-8 md:text-lg md:leading-9">
            {text(profile.summary, locale)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-10">
            <Link href={localizedPath(locale, '/experience', rootMode)} className="rounded-full bg-ink px-6 py-3 text-center text-sm font-semibold text-white hover:bg-coral dark:bg-white dark:text-ink dark:hover:bg-coral dark:hover:text-white">
              {copy.nav.experience}
            </Link>
            <Link href={localizedPath(locale, '/publications', rootMode)} className="rounded-full border border-ink/15 bg-white/50 px-6 py-3 text-center text-sm font-semibold hover:border-teal hover:text-teal dark:border-white/20 dark:bg-white/5">
              {copy.nav.publications}
            </Link>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-coral/20 via-cloud to-teal/20 shadow-soft dark:from-coral/15 dark:via-white/[0.04] dark:to-teal/15 md:min-h-[520px] md:rounded-none">
          <Image src={profile.heroImage} alt="" fill priority sizes="(min-width: 768px) 48vw, 100vw" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/92 via-white/70 to-transparent p-5 text-ink md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <Image src={profile.portrait} alt="" width={116} height={116} className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-soft sm:h-28 sm:w-28" />
              <div>
                <p className="font-serif text-2xl sm:text-3xl">{text(profile.location, locale)}</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-ink/78">{text(profile.longBio, locale)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-cloud/86 px-5 py-14 backdrop-blur dark:border-white/10 dark:bg-white/[0.03] md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
          {profile.skillGroups.map((group) => (
            <div key={text(group.name, locale)} className="rounded-3xl border border-line/70 bg-paper/70 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:rounded-none md:border-0 md:border-l-2 md:border-teal md:bg-transparent md:p-0 md:pl-5 md:shadow-none">
              <h2 className="font-serif text-2xl">{text(group.name, locale)}</h2>
              <p className="mt-3 leading-7 text-ink/65 dark:text-white/65">{group.skills.join(' / ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <SectionHeading
          eyebrow={copy.featuredWork}
          title={locale === 'zh' ? '从研究问题到可运行系统' : 'From research questions to working systems'}
          action={{ label: copy.viewAll, href: localizedPath(locale, '/experience', rootMode) }}
        />
        <div className="grid gap-7 md:grid-cols-2">
          {featuredExperiences.map((item) => (
            <ExperienceCard key={item.id} item={item} locale={locale} compact />
          ))}
        </div>
      </section>

      <section className="bg-[#e0f2fe] px-5 py-20 dark:bg-[#082f49] md:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow={copy.featuredPapers}
            title={locale === 'zh' ? '论文、预印本与研究记录' : 'Papers, preprints, and research notes'}
            action={{ label: copy.viewAll, href: localizedPath(locale, '/publications', rootMode) }}
          />
          {featuredPublications.map((publication) => (
            <PublicationItem key={publication.id} publication={publication} locale={locale} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1fr_0.8fr] md:px-8">
        <div>
          <SectionHeading
            eyebrow={copy.latestWriting}
            title={locale === 'zh' ? '把做过的事写清楚' : 'Writing down the work'}
            action={{ label: copy.viewAll, href: localizedPath(locale, '/blog', rootMode) }}
          />
          <div className="space-y-5">
            {posts.map((post) => (
              <Link key={post.slug} href={localizedPath(locale, `/blog/${post.slug}`, rootMode)} className="block border-t border-line py-5 hover:text-coral dark:border-white/10">
                <p className="text-sm text-ink/55 dark:text-white/55">{formatDate(post.date, locale)}</p>
                <h3 className="mt-2 font-serif text-3xl">{text(post.title, locale)}</h3>
                <p className="mt-3 leading-7 text-ink/68 dark:text-white/68">{text(post.description, locale)}</p>
              </Link>
            ))}
          </div>
        </div>
        <aside>
          <SectionHeading eyebrow={copy.interests} title={locale === 'zh' ? '工作之外的线索' : 'Signals beyond work'} />
          <div className="space-y-4">
            {interests.map((interest) => (
              <div key={text(interest.title, locale)} className="border border-line bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
                <h3 className="font-serif text-2xl">{text(interest.title, locale)}</h3>
                <p className="mt-3 leading-7 text-ink/66 dark:text-white/66">{text(interest.description, locale)}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
