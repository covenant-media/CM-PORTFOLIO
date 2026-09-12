/**
 * Social profiles.
 *
 * One list for every place the studio exists online. Adding a network is a row: pick the
 * network, paste the URL, choose where it shows. Nothing else in the codebase needs to
 * change — the hero row, the footers and the contact sections read this table.
 *
 * A profile is only published once it is both `published` and verified. That gate is a
 * product rule, not a formality: an unverified link is a guess about someone else's
 * account, and the platform does not put guesses on the public site.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, Pill, EmptyState, StatCard } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { ActionButton, Field, SubmitButton, TextInput, Toggle } from '@/components/admin/controls';
import { ConfirmSubmit } from '@/components/admin/confirm';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { socialProfiles } from '@/lib/cms/console';
import { SOCIAL_NETWORKS, SOCIAL_PLACEMENTS } from '@/lib/cms/options';
import { saveSocialAction, socialAction } from '@/app/admin/actions';
import { cx } from '@/lib/utils/text';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Social profiles' };

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [profiles, roleMap] = await Promise.all([socialProfiles(), permissionsForRole(session.user.role)]);
  const level = levelFor(session.user.role, 'social_links', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const params = await searchParams;

  const live = profiles.filter((p) => p.status === 'published' && p.is_verified);

  return (
    <>
      <PageHeader
        eyebrow="Reach"
        title="Social profiles"
        lede="Add an account and it appears wherever that placement is rendered — the media hero row, the footers, the contact pages. A profile only shows publicly once it is published and verified."
      />

      <Notice params={params} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Profiles" value={profiles.length} />
        <StatCard label="Verified" value={profiles.filter((p) => p.is_verified).length} />
        <StatCard label="Live on the site" value={live.length} tone="accent" hint="Published and verified" />
      </div>

      {canWrite ? (
        <section className="mb-6 rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">Add a profile</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
              Paste the full profile URL. Only add accounts you can confirm — a link that leads nowhere is worse than no
              button.
            </p>
          </header>
          <form action={saveSocialAction} className="px-5 py-4">
            <input type="hidden" name="_csrf" value={session.csrfToken} />
            <input type="hidden" name="return_to" value="/admin/social" />
            <div className="grid gap-4 lg:grid-cols-2">
              <TextInput
                label="Network"
                name="network"
                required
                placeholder="tiktok"
                maxLength={40}
                help="Any name works. Pick one of the known networks for the right icon:"
              />
              <TextInput label="Display label" name="label" hint="optional" placeholder="TikTok" maxLength={40} />
              <TextInput label="Profile URL" name="url" type="url" required placeholder="https://www.tiktok.com/@covenant.media" className="lg:col-span-2" />
              <TextInput label="Handle" name="handle" hint="optional" placeholder="@covenant.media" maxLength={60} />
              <TextInput label="Order" name="sort_order" type="number" defaultValue="0" hint="lower first" />
            </div>

            <fieldset className="mt-4">
              <legend className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-fg-dim">Shown in</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-3 border border-line bg-ink-950/40 px-3.5 py-3">
                {SOCIAL_PLACEMENTS.map((placement) => (
                  <label key={placement.value} className="inline-flex items-center gap-2 text-[12.5px] text-fg-muted">
                    <input
                      type="checkbox"
                      name="placements"
                      value={placement.value}
                      defaultChecked={placement.value === 'main'}
                      className="h-3.5 w-3.5 accent-[var(--accent)]"
                    />
                    {placement.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Toggle
                label="Verified by me"
                name="is_verified"
                help="Tick only once you have opened the link yourself and it goes to the right account."
              />
              <Field label="Status" name="status">
                <select
                  id="status"
                  name="status"
                  defaultValue="draft"
                  className="w-full rounded-3 border border-line bg-ink-950/60 px-3 py-2 text-[13px] text-fg focus:border-[var(--accent)]/60 focus:outline-none"
                >
                  <option value="draft">Draft — not shown publicly</option>
                  <option value="published">Published</option>
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <SubmitButton pendingLabel="Adding…">Add profile</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2.5 text-[13px] font-medium text-fg">
          Profiles <span className="text-[11.5px] text-fg-dim">{profiles.length}</span>
        </h3>
        {profiles.length === 0 ? (
          <EmptyState
            title="No social profiles yet"
            hint="Add the accounts you actually use. Known networks are recognised by name and get the right icon."
            action={
              <Link href="/admin/social_links" className="text-[12px] text-fg-muted underline underline-offset-2">
                Or use the full social-links editor
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {profiles.map((profile) => {
              const isLive = profile.status === 'published' && profile.is_verified;
              return (
                <li
                  key={profile.id}
                  className={cx('rounded-4 border bg-ink-900/60', isLive ? 'border-ok-400/35' : 'border-line')}
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-ink-800 text-fg-muted">
                      <Icon name={profile.network} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-fg">{profile.label || profile.network}</p>
                      <p className="truncate font-mono text-[11px] text-fg-dim">{profile.url}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <Pill tone={isLive ? 'ok' : 'warn'}>{isLive ? 'Live' : profile.is_verified ? 'Verified, unpublished' : 'Unverified'}</Pill>
                      {profile.placements.length ? (
                        <span className="text-[11px] text-fg-dim">{profile.placements.join(', ')}</span>
                      ) : (
                        <span className="text-[11px] text-fg-dim/70">no placement</span>
                      )}
                    </div>
                    {canWrite ? (
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <form action={socialAction}>
                          <input type="hidden" name="_csrf" value={session.csrfToken} />
                          <input type="hidden" name="id" value={profile.id} />
                          <input type="hidden" name="op" value={profile.is_verified ? 'unverify' : 'verify'} />
                          <input type="hidden" name="return_to" value="/admin/social" />
                          <ActionButton variant={profile.is_verified ? 'accent' : 'ghost'} pendingLabel="…">
                            {profile.is_verified ? 'Unverify' : 'Verify'}
                          </ActionButton>
                        </form>
                        <form action={socialAction}>
                          <input type="hidden" name="_csrf" value={session.csrfToken} />
                          <input type="hidden" name="id" value={profile.id} />
                          <input type="hidden" name="op" value={profile.status === 'published' ? 'draft' : 'publish'} />
                          <input type="hidden" name="return_to" value="/admin/social" />
                          <ActionButton pendingLabel="…">{profile.status === 'published' ? 'Unpublish' : 'Publish'}</ActionButton>
                        </form>
                      </div>
                    ) : null}
                  </div>

                  {canWrite ? (
                    <details className="border-t border-line">
                      <summary className="cursor-pointer list-none px-4 py-2 text-[11.5px] text-fg-dim hover:text-fg-muted">
                        Edit or remove
                      </summary>
                      <div className="border-t border-line/60 px-4 py-4">
                        <form action={saveSocialAction} className="grid gap-4 lg:grid-cols-2">
                          <input type="hidden" name="_csrf" value={session.csrfToken} />
                          <input type="hidden" name="id" value={profile.id} />
                          <input type="hidden" name="return_to" value="/admin/social" />
                          <TextInput label="Network" name="network" defaultValue={profile.network} required maxLength={40} />
                          <TextInput label="Display label" name="label" defaultValue={profile.label} maxLength={40} />
                          <TextInput label="Profile URL" name="url" type="url" defaultValue={profile.url} required className="lg:col-span-2" />
                          <TextInput label="Handle" name="handle" defaultValue={profile.handle} maxLength={60} />
                          <TextInput label="Order" name="sort_order" type="number" defaultValue={String(profile.sort_order)} />
                          <fieldset className="lg:col-span-2">
                            <legend className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-fg-dim">Shown in</legend>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-3 border border-line bg-ink-950/40 px-3.5 py-3">
                              {SOCIAL_PLACEMENTS.map((placement) => (
                                <label key={placement.value} className="inline-flex items-center gap-2 text-[12.5px] text-fg-muted">
                                  <input
                                    type="checkbox"
                                    name="placements"
                                    value={placement.value}
                                    defaultChecked={profile.placements.includes(placement.value)}
                                    className="h-3.5 w-3.5 accent-[var(--accent)]"
                                  />
                                  {placement.label}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <div className="lg:col-span-2">
                            <Toggle label="Verified by me" name="is_verified" defaultChecked={profile.is_verified} />
                          </div>
                          <div className="lg:col-span-2">
                            <SubmitButton>Save changes</SubmitButton>
                          </div>
                        </form>
                        <form action={socialAction} className="mt-3 border-t border-line/60 pt-3">
                          <input type="hidden" name="_csrf" value={session.csrfToken} />
                          <input type="hidden" name="id" value={profile.id} />
                          <input type="hidden" name="op" value="delete" />
                          <input type="hidden" name="return_to" value="/admin/social" />
                          <ConfirmSubmit message={`Remove the ${profile.label || profile.network} profile?`}>Remove</ConfirmSubmit>
                        </form>
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {canWrite ? (
        <p className="mt-4 text-[11.5px] leading-relaxed text-fg-dim">
          Known networks: {SOCIAL_NETWORKS.map((n) => n.label).join(', ')}. Use one of those names and the right icon is
          drawn automatically; anything else falls back to a generic link mark.
        </p>
      ) : null}
    </>
  );
}
