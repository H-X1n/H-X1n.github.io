export const locales = ['zh', 'en'] as const;

export type Locale = (typeof locales)[number];

export type LocalizedString = Record<Locale, string>;

export const defaultLocale: Locale = 'zh';

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function text(value: LocalizedString, locale: Locale) {
  return value[locale] ?? value[defaultLocale];
}

export const dictionary = {
  zh: {
    nav: {
      home: '首页',
      about: '关于',
      experience: '经历',
      publications: '论文',
      blog: '博客',
      resume: '简历',
      contact: '联系',
    },
    languageLabel: 'English',
    introLabel: '个人主页',
    featuredWork: '精选项目',
    featuredPapers: '代表论文',
    latestWriting: '最新写作',
    interests: '兴趣爱好',
    viewAll: '查看全部',
    readPost: '阅读文章',
    present: '至今',
    empty: '内容准备中。',
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      experience: 'Experience',
      publications: 'Publications',
      blog: 'Blog',
      resume: 'Resume',
      contact: 'Contact',
    },
    languageLabel: '中文',
    introLabel: 'Personal Homepage',
    featuredWork: 'Selected Work',
    featuredPapers: 'Publications',
    latestWriting: 'Latest Writing',
    interests: 'Interests',
    viewAll: 'View all',
    readPost: 'Read post',
    present: 'Present',
    empty: 'Content coming soon.',
  },
} as const;
