import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { LocalizedString, Locale } from '@/i18n';

const blogDirectory = path.join(process.cwd(), 'content', 'blog');

export type BlogLanguage = Locale | 'bilingual';

export type BlogFrontmatter = {
  title: LocalizedString;
  description: LocalizedString;
  date: string;
  language: BlogLanguage;
  tags: string[];
};

export type BlogPost = BlogFrontmatter & {
  slug: string;
};

export function getBlogSlugs() {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }

  return fs
    .readdirSync(blogDirectory)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));
}

export function getPostSource(slug: string) {
  const fullPath = path.join(blogDirectory, `${slug}.mdx`);
  return fs.readFileSync(fullPath, 'utf8');
}

export function getPostBySlug(slug: string): BlogPost {
  const source = getPostSource(slug);
  const { data } = matter(source);

  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    language: data.language,
    tags: data.tags ?? [],
  };
}

export function getAllPosts() {
  return getBlogSlugs()
    .map((slug) => getPostBySlug(slug))
    .sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)));
}
