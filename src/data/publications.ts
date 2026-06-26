import type { LocalizedString } from '@/i18n';

export type Publication = {
  id: string;
  title: LocalizedString;
  authors: string[];
  venue: string;
  year: number;
  type: 'conference' | 'journal' | 'preprint' | 'workshop' | 'patent';
  status: LocalizedString;
  summary: LocalizedString;
  featured?: boolean;
  links?: {
    paper?: string;
    code?: string;
    doi?: string;
    arxiv?: string;
    bibtex?: string;
  };
};

export const publications: Publication[] = [
  {
    id: 'example-publication-1',
    title: {
      zh: '请替换为你的论文标题',
      en: 'Replace with your paper title',
    },
    authors: ['黄鑫', '合作者'],
    venue: '请替换为期刊/会议名称',
    year: 2026,
    type: 'conference',
    status: {
      zh: '请替换为状态（如：已发表/在投/预印本）',
      en: 'Replace with status (e.g., Published/Under submission/Preprint)',
    },
    summary: {
      zh: '请替换为论文简介。简要描述研究问题、方法和主要贡献。',
      en: 'Replace with a paper summary. Briefly describe the research problem, method, and main contributions.',
    },
    featured: true,
  },
];
