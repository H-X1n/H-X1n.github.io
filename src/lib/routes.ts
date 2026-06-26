import type { Locale } from '@/i18n';

export function localizedPath(locale: Locale, path = '/', rootMode = false) {
  const normalized = path === '/' ? '' : path;

  if (rootMode && locale === 'zh') {
    return normalized || '/';
  }

  return `/${locale}${normalized}`;
}

export function alternateLocale(locale: Locale): Locale {
  return locale === 'zh' ? 'en' : 'zh';
}
