import type { LocalizedString } from '@/i18n';

export const profile = {
  name: {
    zh: '黄鑫',
    en: 'Huangxin',
  },
  headline: {
    zh: 'AI 算法 / 大模型分布式训练 / 交通信息工程及控制',
    en: 'AI Algorithms / Large Model Distributed Training / Transportation Information Engineering',
  },
  location: {
    zh: '中国',
    en: 'China',
  },
  email: '1366887360@qq.com',
  phone: '18767752677',
  wechat: 'hx1366887360',
  portrait: '/images/portrait-placeholder.png',
  heroImage: '/images/editorial-desk.png',
  summary: {
    zh: '大连交通大学交通信息工程及控制硕士研究生，研究方向聚焦 AI 算法、大模型分布式训练与推理优化。具备 PyTorch、DeepSpeed、FSDP 等分布式训练框架实践经验，关注 Transformers 模型训练与部署。',
    en: 'I am a Transportation Information Engineering and Control master student at Dalian Jiaotong University, focused on AI algorithms, large model distributed training and inference optimization. Experienced with PyTorch, DeepSpeed, FSDP, and other distributed training frameworks, focusing on Transformers model training and deployment.',
  },
  longBio: {
    zh: '我本科毕业于大连交通大学电子信息工程专业，具备扎实的编程与工程基础；硕士阶段在交通信息工程及控制方向继续深造，研究方向聚焦 AI 算法、大模型分布式训练与推理优化。熟悉 PyTorch 深度学习框架、Transformers 模型架构、DeepSpeed/FSDP 分布式训练策略，关注把算法能力落到真实业务场景中。',
    en: 'I received my bachelor degree in Electronic Information Engineering from Dalian Jiaotong University and am now pursuing a master degree in Transportation Information Engineering and Control. My research focuses on AI algorithms, large model distributed training and inference optimization. I am proficient in PyTorch, Transformers architectures, and DeepSpeed/FSDP distributed training strategies.',
  },
  education: [
    {
      school: {
        zh: '大连交通大学',
        en: 'Dalian Jiaotong University',
      },
      degree: {
        zh: '硕士研究生在读，交通信息工程及控制',
        en: 'M.S. Candidate, Transportation Information Engineering and Control',
      },
      period: '2025/09 - 2028/06',
      details: {
        zh: '研究方向：AI 算法、大模型分布式训练与推理优化。',
        en: 'Research focus: AI algorithms, large model distributed training and inference optimization.',
      },
    },
    {
      school: {
        zh: '大连交通大学',
        en: 'Dalian Jiaotong University',
      },
      degree: {
        zh: '本科，电子信息工程，获工学学士学位',
        en: 'B.S., Electronic Information Engineering',
      },
      period: '2021/09 - 2025/06',
      details: {
        zh: '主修电子信息工程相关课程，具备扎实的编程与工程基础。',
        en: 'Coursework in electronic information engineering with solid programming and engineering foundations.',
      },
    },
  ],
  skillGroups: [
    {
      name: {
        zh: '编程语言',
        en: 'Programming Languages',
      },
      skills: ['Python'],
    },
    {
      name: {
        zh: '深度学习框架',
        en: 'Deep Learning Frameworks',
      },
      skills: ['PyTorch', 'Transformers'],
    },
    {
      name: {
        zh: '分布式训练',
        en: 'Distributed Training',
      },
      skills: ['DeepSpeed', 'FSDP'],
    },
    {
      name: {
        zh: '工具与平台',
        en: 'Tools & Platforms',
      },
      skills: ['Codex', 'Claude Code', 'Git', 'Linux'],
    },
  ],
  honors: [
    {
      zh: '请替换为你的荣誉奖项',
      en: 'Replace with your honors and awards',
    },
  ],
  service: [
    {
      zh: '请替换为你的学生工作或社会服务经历。',
      en: 'Replace with your student service or community involvement.',
    },
  ],
  languages: [
    {
      zh: '请在此填写你的语言能力。',
      en: 'Describe your language proficiency here.',
    },
  ],
  socials: [
    {
      label: 'GitHub',
      href: 'https://github.com/',
    },
  ],
} satisfies {
  name: LocalizedString;
  headline: LocalizedString;
  location: LocalizedString;
  email: string;
  phone: string;
  wechat: string;
  portrait: string;
  heroImage: string;
  summary: LocalizedString;
  longBio: LocalizedString;
  education: Array<{
    school: LocalizedString;
    degree: LocalizedString;
    period: string;
    details: LocalizedString;
  }>;
  skillGroups: Array<{
    name: LocalizedString;
    skills: string[];
  }>;
  honors: LocalizedString[];
  service: LocalizedString[];
  languages: LocalizedString[];
  socials: Array<{
    label: string;
    href: string;
  }>;
};
