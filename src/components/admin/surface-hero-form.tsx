/**
 * The hero/intro editor, shared by every surface.
 *
 * Both the media one-pager and the main landing page open with the same composition —
 * eyebrow, a two-part name, a role line, an intro and two calls to action — so they share
 * one form and one row shape (`surface_hero`, keyed by surface). The only things that
 * differ are the words around it and where saving lands, which is what the props carry.
 */
import { Icon } from '@/components/ui/Icon';
import { LinesInput, SubmitButton, TextArea, TextInput } from '@/components/admin/controls';
import { saveSurfaceHeroAction } from '@/app/admin/actions';
import type { SurfaceHero } from '@/lib/cms/console';

export interface HeroCopy {
  /** What the section is called in the CMS — differs per surface. */
  title: string;
  lede: string;
  /** Placeholders, so an empty form still shows the shape of the real thing. */
  eyebrowPlaceholder: string;
  givenPlaceholder: string;
  familyPlaceholder: string;
  rolesPlaceholder: string;
  introPlaceholder: string;
  primaryPlaceholder: string;
  secondaryPlaceholder: string;
  capabilityPlaceholder: string;
  /** Surfaces that roll a role line vs ones that print a static subtitle. */
  rolesLabel: string;
  rolesHelp: string;
  showCapabilities: boolean;
}

export const MEDIA_HERO_COPY: HeroCopy = {
  title: 'Hero & intro text',
  lede: 'The greeting, the name and the paragraph under it at the top of /media. Save and the public page picks it up on the next visit — no deploy needed.',
  eyebrowPlaceholder: "HELLO, I'M",
  givenPlaceholder: 'Covenant',
  familyPlaceholder: 'Nsikan',
  rolesPlaceholder: 'Videographer\nVideo Editor\nCinematographer\nPhotographer\nContent Creator',
  introPlaceholder: 'I take a project from the first idea to the delivered film…',
  primaryPlaceholder: '/media/long-form',
  secondaryPlaceholder: '#contact',
  capabilityPlaceholder: 'Videography\nVideo editing\nLive streaming\nPhotography',
  rolesLabel: 'The role line',
  rolesHelp: 'These words roll upward under the name, one at a time.',
  showCapabilities: true,
};

export const MAIN_HERO_COPY: HeroCopy = {
  title: 'Hero & headline text',
  lede: 'The first thing a visitor reads at the root of the site. Save and the landing page picks it up on the next visit.',
  eyebrowPlaceholder: 'COVENANT MEDIA',
  givenPlaceholder: 'Covenant',
  familyPlaceholder: 'Media',
  rolesPlaceholder: 'Media production\nSoftware engineering\nCybersecurity',
  introPlaceholder: 'One studio for the film, the photograph and the system behind them.',
  primaryPlaceholder: '/work',
  secondaryPlaceholder: '/contact',
  capabilityPlaceholder: '',
  rolesLabel: 'Disciplines',
  rolesHelp: 'Printed as a list under the headline. One per line.',
  showCapabilities: false,
};

export function SurfaceHeroForm({
  surface,
  hero,
  csrf,
  canWrite,
  copy,
  returnTo,
}: {
  surface: 'media' | 'main' | 'tech';
  hero: SurfaceHero;
  csrf: string;
  canWrite: boolean;
  copy: HeroCopy;
  returnTo: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <form action={saveSurfaceHeroAction} className="space-y-4">
        <input type="hidden" name="_csrf" value={csrf} />
        <input type="hidden" name="surface" value={surface} />
        <input type="hidden" name="return_to" value={returnTo} />

        <section className="rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">The greeting</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">The line above the name, then the name itself.</p>
          </header>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <TextInput
              label="Eyebrow"
              name="eyebrow"
              defaultValue={hero.eyebrow}
              placeholder={copy.eyebrowPlaceholder}
              hint="optional"
              maxLength={40}
              help="The small mono line above the name. Leave blank to hide it."
              className="sm:col-span-2"
            />
            <TextInput
              label="Given name"
              name="name_given"
              defaultValue={hero.name_given}
              placeholder={copy.givenPlaceholder}
              maxLength={60}
              help="Rendered in the brand accent."
            />
            <TextInput
              label="Second part"
              name="name_family"
              defaultValue={hero.name_family}
              placeholder={copy.familyPlaceholder}
              maxLength={60}
              help="Rendered in the surface white."
            />
          </div>
        </section>

        <section className="rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">{copy.rolesLabel}</h3>
          </header>
          <div className="px-5 py-4">
            <LinesInput
              label={copy.rolesLabel}
              name="roles"
              values={hero.roles}
              rows={6}
              placeholder={copy.rolesPlaceholder}
              hint="one per line"
              help={copy.rolesHelp}
            />
          </div>
        </section>

        <section className="rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">The intro</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">One or two sentences under the headline.</p>
          </header>
          <div className="px-5 py-4">
            <TextArea label="Intro paragraph" name="intro" defaultValue={hero.intro} rows={5} maxLength={600} placeholder={copy.introPlaceholder} />
          </div>
        </section>

        <section className="rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">Calls to action</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">Leave a label blank and the button is not drawn.</p>
          </header>
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <TextInput label="Primary label" name="primary_label" defaultValue={hero.primary_label} placeholder="See the work" maxLength={30} />
            <TextInput label="Primary link" name="primary_href" defaultValue={hero.primary_href} placeholder={copy.primaryPlaceholder} maxLength={200} />
            <TextInput label="Secondary label" name="secondary_label" defaultValue={hero.secondary_label} placeholder="Start a project" maxLength={30} />
            <TextInput label="Secondary link" name="secondary_href" defaultValue={hero.secondary_href} placeholder={copy.secondaryPlaceholder} maxLength={200} />
          </div>
        </section>

        {copy.showCapabilities ? (
          <section className="rounded-4 border border-line bg-ink-900/60">
            <header className="border-b border-line px-5 py-3">
              <h3 className="text-[12.5px] font-medium text-fg">Capability list</h3>
              <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">The short line of what the studio does, under the video card.</p>
            </header>
            <div className="px-5 py-4">
              <LinesInput
                label="Capabilities"
                name="capabilities"
                values={hero.capabilities}
                rows={6}
                hint="one per line"
                placeholder={copy.capabilityPlaceholder}
              />
            </div>
          </section>
        ) : null}

        <div className="flex items-center gap-3">
          {canWrite ? (
            <SubmitButton>Save hero text</SubmitButton>
          ) : (
            <p className="text-[12.5px] text-fg-dim">Your role can read this screen but not change it.</p>
          )}
          {hero.updated_at ? (
            <span className="text-[11.5px] text-fg-dim">
              Last saved {new Date(hero.updated_at).toISOString().slice(0, 16).replace('T', ' ')} UTC
            </span>
          ) : null}
        </div>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-4 border border-line bg-ink-950/60 px-5 py-4">
          <p className="mb-3 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-fg-dim">
            <Icon name="eye" size={12} /> How it will read
          </p>
          <div className="rounded-3 border border-line bg-ink-1000 px-4 py-5">
            {hero.eyebrow ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim">{hero.eyebrow}</p>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim/40">no eyebrow</p>
            )}
            <p className="mt-1.5 font-display text-[26px] leading-[1.06]">
              {hero.name_given ? <span className="text-[var(--accent)]">{hero.name_given}</span> : <span className="text-fg-dim/40">First part</span>}
              {hero.name_family ? <span className="text-fg"> {hero.name_family}</span> : null}
            </p>
            {hero.roles.length ? (
              <p className="mt-1.5 text-[12.5px] text-fg-muted">
                {hero.roles.slice(0, 3).join(' · ')}
                {hero.roles.length > 3 ? ' …' : ''}
              </p>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-fg-dim/40">no roles yet</p>
            )}
            {hero.intro ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-fg-muted">{hero.intro}</p>
            ) : (
              <p className="mt-3 text-[12.5px] italic text-fg-dim/40">The intro paragraph will appear here.</p>
            )}
            {hero.primary_label || hero.secondary_label ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {hero.primary_label ? (
                  <span className="rounded-pill bg-[var(--accent)] px-3 py-1 text-[11.5px] font-medium text-[var(--accent-ink)]">
                    {hero.primary_label}
                  </span>
                ) : null}
                {hero.secondary_label ? (
                  <span className="rounded-pill border border-line px-3 py-1 text-[11.5px] text-fg-muted">{hero.secondary_label}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          {hero.capabilities.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {hero.capabilities.map((item) => (
                <li key={item} className="rounded-pill border border-line px-2 py-[2px] text-[11px] text-fg-dim">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
