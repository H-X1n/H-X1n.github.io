import Link from 'next/link';
import type { ReactNode } from 'react';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  action?: {
    label: string;
    href: string;
  };
  children?: ReactNode;
};

export function SectionHeading({ eyebrow, title, action, children }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="font-accent mb-3 text-lg text-coral">{eyebrow}</p>
        ) : null}
        <h2 className="font-serif text-[2.15rem] leading-tight md:text-5xl">{title}</h2>
        {children ? <div className="mt-4 text-base leading-8 text-ink/68 dark:text-white/68">{children}</div> : null}
      </div>
      {action ? (
        <Link href={action.href} className="w-fit rounded-full border border-ink/15 px-5 py-2 text-sm font-medium hover:border-teal hover:text-teal dark:border-white/20">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
