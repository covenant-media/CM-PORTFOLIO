'use client';

/**
 * "Tools I use" — the strip that sits between the process and the client stories.
 *
 * **One place, no movement.** The band was designed from the owner's own reference
 * (`toolsused.PNG`): a small centred title over a single, static row of tiles. The right-to-left
 * ticker it used to run is gone — nothing drifts, so the row reads as a settled statement of the
 * kit rather than as decoration, and there is nothing to wait for or chase.
 *
 * **Real marks, evenly spaced.** Each tile holds the tool's own icon (`ToolMark`), and the row is
 * centred and allowed to wrap, so on a phone it becomes two tidy rows rather than a scroll. The
 * tiles are the same size and the gaps are the same size, which is what makes it look arranged
 * rather than assembled.
 *
 * Names are never printed. Each tile carries the tool's name as its accessible label only, so the
 * band reads as logos while assistive technology still announces what they are.
 */
import { ToolMark } from '@/components/ui/ToolMark';
import type { MediaTool } from '@/lib/media/sample-portfolio';
import { cx } from '@/lib/utils/text';

function Tile({ tool }: { tool: MediaTool }) {
  return (
    <li
      className="grid size-12 shrink-0 place-items-center rounded-3 border border-[rgba(243,241,236,.08)] bg-[rgba(243,241,236,.045)] transition duration-500 hover:border-[rgba(243,241,236,.2)] hover:bg-[rgba(243,241,236,.075)] sm:size-14 md:size-16"
      role="img"
      aria-label={tool.name}
      title={tool.name}
    >
      <ToolMark id={tool.id} className="size-6 sm:size-7 md:size-8" />
    </li>
  );
}

export function MediaTools({ tools, className }: { tools: MediaTool[]; className?: string }) {
  if (!tools.length) return null;

  return (
    <section aria-labelledby="media-tools-heading" className={className}>
      <div className="container-page">
        <div className={cx('overflow-hidden rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-950)]/60 py-7 backdrop-blur md:py-9')}>
          <p id="media-tools-heading" className="text-center font-display text-[1.0625rem] tracking-[-0.015em] text-fg md:text-[1.15rem]">
            Tools I use
          </p>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2.5 px-4 sm:gap-3 md:mt-7 md:gap-4">
            {tools.map((tool) => (
              <Tile key={tool.id} tool={tool} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
