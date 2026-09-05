import { ExperienceShell, type Surface } from './ExperienceShell';
import { PageHeader } from '@/components/blocks/heroes';
import { Blocks } from '@/components/blocks';
import { pageBySlug } from '@/lib/cms/content';
import { planFor } from '@/lib/cms/page-plans';

/**
 * The public page skeleton every route shares.
 *
 * Resolution order: the CMS page (slug) → its ordered sections. If the page has
 * not been created in the CMS yet, the structural plan for that route is used so
 * the experience still renders from live module data (projects, videos,
 * services, testimonials) instead of hardcoded prose.
 */
export async function CmsPage({
  surface,
  path,
  slug,
  title,
  eyebrow,
  lede,
  children,
  headerMeta,
  headerActions,
  hideHeader = false,
}: {
  surface: Surface;
  path: string;
  /** CMS page slug — defaults to the path, "/" being "home". */
  slug?: string;
  title: string;
  eyebrow?: string;
  lede?: string | null;
  children?: React.ReactNode;
  headerMeta?: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Detail pages carry their own hero. */
  hideHeader?: boolean;
}) {
  const key = slug ?? (path === '/' ? 'home' : path.replace(/^\/+/, ''));
  const page = await pageBySlug(key);
  const blocks = page.exists && page.sections.length ? page.sections : planFor(key);
  const isHome = path === '/';
  const startsWithHero = blocks[0]?.type.startsWith('hero_');
  const hasHeaderBlock = blocks.some((block) => block.type === 'page_header');

  return (
    <ExperienceShell surface={surface}>
      {!isHome && !hideHeader && !startsWithHero && !hasHeaderBlock ? (
        <PageHeader
          surface={surface}
          eyebrow={eyebrow ?? (page.title && page.title !== title ? page.title : title)}
          title={page.exists ? page.title || title : title}
          lede={page.exists ? page.description || lede : lede}
          meta={headerMeta}
          actions={headerActions}
        />
      ) : null}
      <Blocks blocks={blocks} scope={{ division: surface, pageSlug: key }} />
      {children}
    </ExperienceShell>
  );
}
