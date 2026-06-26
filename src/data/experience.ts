import type { LocalizedString } from '@/i18n';

export type ExperienceKind = 'project' | 'internship' | 'research';

export type ExperienceItem = {
  id: string;
  kind: ExperienceKind;
  featured?: boolean;
  period: string;
  organization: LocalizedString;
  title: LocalizedString;
  summary: LocalizedString;
  highlights: LocalizedString[];
  tech: string[];
  image: string;
  links?: Array<{
    label: string;
    href: string;
  }>;
};

export const experiences: ExperienceItem[] = [
  {
    id: 'example-project-1',
    kind: 'research',
    featured: true,
    period: '请替换为时间段',
    organization: {
      zh: '请替换为组织/公司名称',
      en: 'Replace with organization name',
    },
    title: {
      zh: '请替换为你的项目/实习标题',
      en: 'Replace with your project/internship title',
    },
    summary: {
      zh: '请替换为项目简介。描述你做了什么、用了什么技术、取得了什么成果。',
      en: 'Replace with a project summary. Describe what you did, what tech you used, and what results you achieved.',
    },
    highlights: [
      {
        zh: '亮点 1：请描述你的关键贡献或成果。',
        en: 'Highlight 1: describe your key contribution or result.',
      },
      {
        zh: '亮点 2：请描述你的关键贡献或成果。',
        en: 'Highlight 2: describe your key contribution or result.',
      },
    ],
    tech: ['Python', 'PyTorch'],
    image: '/images/research-notes.png',
  },
  {
    id: 'example-project-2',
    kind: 'project',
    featured: true,
    period: '请替换为时间段',
    organization: {
      zh: '请替换为组织/公司名称',
      en: 'Replace with organization name',
    },
    title: {
      zh: '请替换为你的项目标题',
      en: 'Replace with your project title',
    },
    summary: {
      zh: '请替换为项目简介。',
      en: 'Replace with a project summary.',
    },
    highlights: [
      {
        zh: '亮点 1：请描述你的关键贡献或成果。',
        en: 'Highlight 1: describe your key contribution or result.',
      },
    ],
    tech: ['DeepSpeed', 'FSDP', 'Transformers'],
    image: '/images/platform-work.png',
  },
];
