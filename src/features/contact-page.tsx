import { SectionHeading } from '@/components/section-heading';
import { profile } from '@/data/profile';
import { type Locale, text } from '@/i18n';

export function ContactPage({ locale }: { locale: Locale }) {
  const directContacts = [
    {
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
    },
    {
      label: locale === 'zh' ? '电话' : 'Phone',
      value: profile.phone,
      href: `tel:${profile.phone}`,
    },
    {
      label: locale === 'zh' ? '微信' : 'WeChat',
      value: profile.wechat,
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={locale === 'zh' ? '联系' : 'Contact'}
        title={locale === 'zh' ? '欢迎交流研究、项目和写作' : 'Open to research, projects, and writing conversations'}
      >
        <p>{text(profile.summary, locale)}</p>
      </SectionHeading>

      <div className="grid gap-5 sm:grid-cols-2">
        {directContacts.map((item) => {
          const content = (
            <>
              <p className="text-sm uppercase tracking-[0.18em] text-coral">{item.label}</p>
              <h2 className="mt-4 break-words font-serif text-3xl">{item.value}</h2>
            </>
          );

          return item.href ? (
            <a key={item.label} href={item.href} className="rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
              {content}
            </a>
          ) : (
            <div key={item.label} className="rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
              {content}
            </div>
          );
        })}
        {profile.socials.map((item) => (
          <a key={item.label} href={item.href} className="rounded-[1.75rem] border border-line bg-white/92 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-white/10 dark:bg-white/[0.04] sm:p-6 md:rounded-none">
            <p className="text-sm uppercase tracking-[0.18em] text-teal">Link</p>
            <h2 className="mt-4 font-serif text-3xl">{item.label}</h2>
          </a>
        ))}
      </div>
    </section>
  );
}
