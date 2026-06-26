import { ExperienceCard } from '@/components/experience-card';
import { SectionHeading } from '@/components/section-heading';
import { experiences } from '@/data/experience';
import { type Locale } from '@/i18n';

export function ExperiencePage({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={locale === 'zh' ? '经历' : 'Experience'}
        title={locale === 'zh' ? '项目、实习与科研轨迹' : 'Projects, internships, and research work'}
      >
        <p>
          {locale === 'zh'
            ? '这里按时间和类型整理 AI Infra、多模态视觉、医学影像重建、科研和项目实践。'
            : 'This page organizes AI infra, multimodal vision, medical imaging reconstruction, research, and project experience by time and type.'}
        </p>
      </SectionHeading>

      <div className="grid gap-8 md:grid-cols-2">
        {experiences.map((item) => (
          <ExperienceCard key={item.id} item={item} locale={locale} />
        ))}
      </div>
    </section>
  );
}
