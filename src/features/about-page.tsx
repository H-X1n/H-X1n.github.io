import { SectionHeading } from '@/components/section-heading';
import { interests } from '@/data/interests';
import { profile } from '@/data/profile';
import { type Locale, text } from '@/i18n';

export function AboutPage({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={locale === 'zh' ? '关于我' : 'About'}
        title={locale === 'zh' ? '研究、工程和长期好奇心' : 'Research, engineering, and durable curiosity'}
      >
        <p>{text(profile.longBio, locale)}</p>
      </SectionHeading>

      <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <div className="border-t border-line pt-6 dark:border-white/10">
          <h2 className="font-serif text-3xl">{locale === 'zh' ? '教育背景' : 'Education'}</h2>
          <div className="mt-6 space-y-6">
            {profile.education.map((item) => (
              <article key={`${item.period}-${text(item.school, locale)}`}>
                <p className="text-sm font-semibold text-coral">{item.period}</p>
                <h3 className="mt-2 font-serif text-2xl">{text(item.school, locale)}</h3>
                <p className="mt-2 leading-7 text-ink/68 dark:text-white/68">{text(item.degree, locale)}</p>
                <p className="mt-2 text-sm leading-6 text-ink/58 dark:text-white/58">{text(item.details, locale)}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '技能栈' : 'Skills'}</h2>
            <div className="mt-6 space-y-5">
              {profile.skillGroups.map((group) => (
                <div key={text(group.name, locale)}>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-teal">{text(group.name, locale)}</h3>
                  <p className="mt-2 leading-7 text-ink/70 dark:text-white/70">{group.skills.join(' / ')}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '荣誉奖项' : 'Honors'}</h2>
            <div className="mt-6 grid gap-4">
              {profile.honors.map((honor) => (
                <div key={text(honor, locale)} className="border-l-2 border-coral pl-4">
                  <p className="leading-7 text-ink/70 dark:text-white/70">{text(honor, locale)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '学生工作与语言' : 'Service & Language'}</h2>
            <div className="mt-6 grid gap-4">
              {[...profile.service, ...profile.languages].map((item) => (
                <p key={text(item, locale)} className="border-l-2 border-teal pl-4 leading-7 text-ink/66 dark:text-white/66">
                  {text(item, locale)}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
            <h2 className="font-serif text-3xl">{locale === 'zh' ? '兴趣爱好' : 'Interests'}</h2>
            <div className="mt-6 grid gap-4">
              {interests.map((interest) => (
                <div key={text(interest.title, locale)} className="border-l-2 border-coral pl-4">
                  <h3 className="font-serif text-xl">{text(interest.title, locale)}</h3>
                  <p className="mt-2 leading-7 text-ink/66 dark:text-white/66">{text(interest.description, locale)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
