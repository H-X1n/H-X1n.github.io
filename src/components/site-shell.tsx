import Link from 'next/link';
import type { ReactNode } from 'react';
import { dictionary, type Locale, text } from '@/i18n';
import { profile } from '@/data/profile';
import { alternateLocale, localizedPath } from '@/lib/routes';

type SiteShellProps = {
  locale: Locale;
  children: ReactNode;
  rootMode?: boolean;
  currentPath?: string;
};

const navItems = [
  ['about', '/about'],
  ['experience', '/experience'],
  ['publications', '/publications'],
  ['blog', '/blog'],
  ['resume', '/resume'],
  ['contact', '/contact'],
] as const;

const mobileNavItems = [['home', '/'], ...navItems] as const;

export function SiteShell({ locale, children, rootMode = false, currentPath = '/' }: SiteShellProps) {
  const copy = dictionary[locale];
  const otherLocale = alternateLocale(locale);
  const switchPath = localizedPath(otherLocale, currentPath);
  const normalizedCurrentPath = currentPath === '/' ? '/' : currentPath.replace(/\/$/, '');
  const isActive = (href: string) => {
    if (href === '/') {
      return normalizedCurrentPath === '/';
    }

    return normalizedCurrentPath === href || normalizedCurrentPath.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink [background:radial-gradient(circle_at_10%_4rem,rgba(56,189,248,0.2),transparent_26rem),radial-gradient(circle_at_86%_7rem,rgba(14,165,233,0.16),transparent_24rem),radial-gradient(circle_at_70%_34rem,rgba(125,211,252,0.18),transparent_24rem),#f2fbff] dark:bg-[#071827] dark:text-[#f2fbff] dark:[background:radial-gradient(circle_at_10%_4rem,rgba(56,189,248,0.2),transparent_26rem),radial-gradient(circle_at_86%_7rem,rgba(14,165,233,0.18),transparent_24rem),#071827]">
      <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/88 backdrop-blur-xl dark:border-white/10 dark:bg-[#17141f]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href={localizedPath(locale, '/', rootMode)} className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-semibold text-white dark:bg-white dark:text-ink">
              {text(profile.name, locale).slice(0, 1)}
            </span>
            <span>
              <span className="block font-serif text-lg leading-none">{text(profile.name, locale)}</span>
              <span className="font-accent mt-1 block text-sm text-ink/55 dark:text-white/55">
                {copy.introLabel}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map(([key, href]) => (
              <Link
                key={key}
                href={localizedPath(locale, href, rootMode)}
                className="rounded-full px-4 py-2 text-sm text-ink/70 transition hover:bg-white hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {copy.nav[key]}
              </Link>
            ))}
          </nav>

          <Link
            href={switchPath}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition hover:border-coral hover:text-coral dark:border-white/20 dark:hover:border-coral"
          >
            {copy.languageLabel}
          </Link>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 md:px-8 lg:hidden" aria-label="Mobile navigation">
          {mobileNavItems.map(([key, href]) => (
            <Link
              key={key}
              href={localizedPath(locale, href, rootMode)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive(href)
                  ? 'border-ink bg-ink text-white shadow-soft dark:border-white dark:bg-white dark:text-ink'
                  : 'border-ink/10 bg-white/75 text-ink/70 hover:border-teal hover:text-teal dark:border-white/10 dark:bg-white/10 dark:text-white/72'
              }`}
            >
              {copy.nav[key]}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t border-line px-5 py-10 dark:border-white/10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-ink/60 dark:text-white/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {text(profile.name, locale)}.</p>
          <div className="flex flex-wrap gap-4">
            {profile.socials.map((item) => (
              <a key={item.label} href={item.href} className="hover:text-coral">
                {item.label}
              </a>
            ))}
            <a href={`mailto:${profile.email}`} className="hover:text-coral">
              {profile.email}
            </a>
            <a href={`tel:${profile.phone}`} className="hover:text-coral">
              {profile.phone}
            </a>
            <span>WeChat: {profile.wechat}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
