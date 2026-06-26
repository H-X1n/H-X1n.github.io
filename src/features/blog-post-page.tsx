import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { SectionHeading } from '@/components/section-heading';
import { type Locale, text } from '@/i18n';
import { formatDate } from '@/lib/format';
import { getPostBySlug, getPostSource } from '@/lib/blog';

export function BlogPostPage({ locale, slug }: { locale: Locale; slug: string }) {
  const post = getPostBySlug(slug);
  const source = getPostSource(slug);
  const { content } = matter(source);

  return (
    <article className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={`${formatDate(post.date, locale)} / ${post.language}`}
        title={text(post.title, locale)}
      >
        <p>{text(post.description, locale)}</p>
      </SectionHeading>

      <div className="mb-10 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-ink/[0.06] px-3 py-1 text-xs text-ink/70 dark:bg-white/10 dark:text-white/70">
            {tag}
          </span>
        ))}
      </div>

      <div className="prose-site text-ink/78 dark:text-white/78">
        <MDXRemote source={content} />
      </div>
    </article>
  );
}
