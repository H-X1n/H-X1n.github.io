import { ExperienceCard } from '@/components/experience-card';
import { SectionHeading } from '@/components/section-heading';
import { experiences } from '@/data/experience';
import { profile } from '@/data/profile';
import { publications } from '@/data/publications';
import { dictionary, type Locale, text } from '@/i18n';

export function ResumePage({ locale }: { locale: Locale }) {
  const copy = dictionary[locale];

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={copy.nav.resume}
        title={locale === 'zh' ? '一页式简历概览' : 'One-page resume overview'}
      >
        <p>{text(profile.summary, locale)}</p>
      </SectionHeading>

      <div className="mb-10 rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
        <div>
          <h2 className="font-serif text-3xl">{text(profile.name, locale)}</h2>
          <p className="mt-2 text-ink/68 dark:text-white/68">{text(profile.headline, locale)}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-ink/60 dark:text-white/60">
            <a href={`mailto:${profile.email}`} className="hover:text-coral">{profile.email}</a>
            <a href={`tel:${profile.phone}`} className="hover:text-coral">{profile.phone}</a>
            <span>WeChat: {profile.wechat}</span>
            <span>{text(profile.location, locale)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr]">
        <div>
          <h2 className="font-serif text-3xl">{copy.nav.experience}</h2>
          <div className="mt-6 grid gap-6">
            {experiences.map((item) => (
              <ExperienceCard key={item.id} item={item} locale={locale} compact />
            ))}
          </div>
        </div>

        <aside className="space-y-8">
          <div>
            <h2 className="font-serif text-3xl">{copy.nav.publications}</h2>
            <div className="mt-5 space-y-5">
              {publications.map((publication) => (
                <div key={publication.id} className="border-l-2 border-teal pl-4">
                  <p className="text-sm font-semibold text-coral">{publication.year}</p>
                  <h3 className="mt-1 font-serif text-xl">{text(publication.title, locale)}</h3>
                  <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{publication.venue}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '技能' : 'Skills'}</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.skillGroups.flatMap((group) => group.skills).map((skill) => (
                <span key={skill} className="rounded-full bg-ink/[0.06] px-3 py-1 text-sm dark:bg-white/10">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '教育背景' : 'Education'}</h2>
            <div className="mt-5 space-y-5">
              {profile.education.map((item) => (
                <div key={`${item.period}-${text(item.degree, locale)}`} className="border-l-2 border-coral pl-4">
                  <p className="text-sm font-semibold text-coral">{item.period}</p>
                  <h3 className="mt-1 font-serif text-xl">{text(item.school, locale)}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink/65 dark:text-white/65">{text(item.degree, locale)}</p>
                  <p className="mt-1 text-sm leading-6 text-ink/55 dark:text-white/55">{text(item.details, locale)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '荣誉奖项' : 'Honors'}</h2>
            <div className="mt-5 space-y-3">
              {profile.honors.map((honor) => (
                <p key={text(honor, locale)} className="border-l-2 border-teal pl-4 text-sm leading-6 text-ink/65 dark:text-white/65">
                  {text(honor, locale)}
                </p>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '学生工作与语言' : 'Service & Language'}</h2>
            <div className="mt-5 space-y-3">
              {[...profile.service, ...profile.languages].map((item) => (
                <p key={text(item, locale)} className="border-l-2 border-coral pl-4 text-sm leading-6 text-ink/65 dark:text-white/65">
                  {text(item, locale)}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
