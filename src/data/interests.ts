import type { LocalizedString } from '@/i18n';

export type Interest = {
  title: LocalizedString;
  description: LocalizedString;
};

export const interests: Interest[] = [
  {
    title: {
      zh: '大模型分布式训练',
      en: 'Large Model Distributed Training',
    },
    description: {
      zh: '探索 DeepSpeed、FSDP 等分布式训练策略，优化大模型训练效率与资源利用率。',
      en: 'Exploring distributed training strategies like DeepSpeed and FSDP to optimize large model training efficiency and resource utilization.',
    },
  },
  {
    title: {
      zh: '技术写作',
      en: 'Technical Writing',
    },
    description: {
      zh: '把调试过程、论文复现和工具链经验写成可重复使用的笔记。',
      en: 'Turning debugging traces, paper reproductions, and tooling experience into reusable notes.',
    },
  },
  {
    title: {
      zh: '开源工具',
      en: 'Open-source Tools',
    },
    description: {
      zh: '喜欢打磨能节省重复劳动的小工具，也关注开发体验。',
      en: 'I enjoy polishing small tools that remove repetitive work and improve developer experience.',
    },
  },
];
