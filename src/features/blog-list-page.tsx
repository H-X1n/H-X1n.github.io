import Link from 'next/link';
import { SectionHeading } from '@/components/section-heading';
import { dictionary, type Locale, text } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getAllPosts } from '@/lib/blog';
import { localizedPath } from '@/lib/routes';

export function BlogListPage({ locale, rootMode = false }: { locale: Locale; rootMode?: boolean }) {
  const posts = getAllPosts();
  const copy = dictionary[locale];

  return (
    <section className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={copy.nav.blog}
        title={locale === 'zh' ? '技术博客与研究笔记' : 'Technical writing and research notes'}
      >
        <p>
          {locale === 'zh'
            ? '博客使用 MDX 维护，适合写论文复现、项目复盘、工具链经验和实验记录。'
            : 'The blog is maintained in MDX for paper reproductions, project notes, tooling experience, and experiment logs.'}
        </p>
      </SectionHeading>

      <div className="space-y-0">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={localizedPath(locale, `/blog/${post.slug}`, rootMode)}
            className="block border-t border-line py-8 transition hover:text-coral dark:border-white/10"
          >
            <p className="text-sm text-ink/55 dark:text-white/55">{formatDate(post.date, locale)}</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{text(post.title, locale)}</h2>
            <p className="mt-4 leading-7 text-ink/68 dark:text-white/68">{text(post.description, locale)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs text-ink/70 dark:bg-white/10 dark:text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
