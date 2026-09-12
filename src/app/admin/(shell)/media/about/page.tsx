/**
 * About the studio.
 *
 * The portrait and the biography under it. The picture is replaced in place — the new
 * file is ingested like any other asset and its id is written straight onto the about
 * row, so "replace the portrait" is one action rather than an upload plus a copy-paste.
 *
 * The bio is a plain textarea: paste a paragraph, save, and the public page reads it on
 * the next visit. Blank stays blank — the page falls back to what ships with the site
 * rather than printing a placeholder sentence.
 */
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { Select, SubmitButton, TextArea, TextInput } from '@/components/admin/controls';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { imageAssetOptions, resolvePortrait, studioAbout } from '@/lib/cms/console';
import { saveStudioAboutAction, uploadStudioPortraitAction } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'About the studio' };

export default async function MediaAboutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [about, assets, roleMap] = await Promise.all([
    studioAbout('media'),
    imageAssetOptions(),
    permissionsForRole(session.user.role),
  ]);
  const level = levelFor(session.user.role, 'media_projects', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const params = await searchParams;
  const portrait = await resolvePortrait(about);

  return (
    <>
      <PageHeader
        eyebrow="Media portfolio"
        title="About the studio"
        lede="The studio portrait and the biography printed under it. Save and /media picks it up on the next visit."
      />

      <Notice params={params} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <form action={saveStudioAboutAction} className="space-y-4">
            <input type="hidden" name="_csrf" value={session.csrfToken} />
            <input type="hidden" name="surface" value="media" />
            <input type="hidden" name="return_to" value="/admin/media/about" />
            <input type="hidden" name="portrait_asset_id" value={about.portrait_asset_id} />

            <section className="rounded-4 border border-line bg-ink-900/60">
              <header className="border-b border-line px-5 py-3">
                <h3 className="text-[12.5px] font-medium text-fg">Headings</h3>
              </header>
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <TextInput label="Section heading" name="heading" defaultValue={about.heading} placeholder="About the Studio" maxLength={90} />
                <TextInput label="Subheading" name="subheading" defaultValue={about.subheading} placeholder="The FACE Behind the Brand" maxLength={90} />
              </div>
            </section>

            <section className="rounded-4 border border-line bg-ink-900/60">
              <header className="border-b border-line px-5 py-3">
                <h3 className="text-[12.5px] font-medium text-fg">Biography</h3>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
                  Paste or rewrite freely — paragraphs are kept as you type them.
                </p>
              </header>
              <div className="px-5 py-4">
                <TextArea label="Bio text" name="bio" defaultValue={about.bio} rows={12} maxLength={4000} placeholder="Covenant Media began…" />
              </div>
            </section>

            <section className="rounded-4 border border-line bg-ink-900/60">
              <header className="border-b border-line px-5 py-3">
                <h3 className="text-[12.5px] font-medium text-fg">Credit line & statement</h3>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">Printed under the portrait and at the end of the section.</p>
              </header>
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <TextInput label="Name in the frame" name="credit_name" defaultValue={about.credit_name} placeholder="Covenant Nsikan" maxLength={80} />
                <TextInput label="Role under the frame" name="credit_role" defaultValue={about.credit_role} placeholder="Founder / CEO, Covenant Media" maxLength={90} />
                <TextInput
                  label="Studio statement"
                  name="statement"
                  defaultValue={about.statement}
                  placeholder="WE CAPTURE. WE CREATE. WE INSPIRE."
                  maxLength={140}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <section className="rounded-4 border border-line bg-ink-900/60">
              <header className="border-b border-line px-5 py-3">
                <h3 className="text-[12.5px] font-medium text-fg">Portrait source</h3>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
                  Normally set by the upload panel on the right. Use this to point at an image already in the library, or at
                  an external URL.
                </p>
              </header>
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                <Select
                  label="Library image"
                  name="portrait_pick"
                  defaultValue={about.portrait_asset_id}
                  placeholder="Keep the uploaded portrait"
                  options={assets.map((asset) => ({ value: asset.value, label: asset.label }))}
                  help="Choosing one here overrides the URL below."
                />
                <TextInput
                  label="Or an image URL"
                  name="portrait_url"
                  defaultValue={about.portrait_url}
                  placeholder="/images/First_Img.png"
                  maxLength={400}
                />
              </div>
            </section>

            <div className="flex items-center gap-3">
              {canWrite ? (
                <SubmitButton>Save about text</SubmitButton>
              ) : (
                <p className="text-[12.5px] text-fg-dim">Your role can read this screen but not change it.</p>
              )}
              {about.updated_at ? (
                <span className="text-[11.5px] text-fg-dim">
                  Last saved {new Date(about.updated_at).toISOString().slice(0, 16).replace('T', ' ')} UTC
                </span>
              ) : null}
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-4 border border-line bg-ink-900/60">
            <header className="border-b border-line px-5 py-3">
              <h3 className="text-[12.5px] font-medium text-fg">Current portrait</h3>
            </header>
            <div className="px-5 py-4">
              {portrait ? (
                <img src={portrait} alt="Current studio portrait" className="w-full rounded-3 border border-line object-cover" loading="lazy" />
              ) : (
                <div className="grid aspect-[4/5] w-full place-items-center rounded-3 border border-dashed border-line bg-ink-950/50 text-fg-dim">
                  <Icon name="image" size={22} />
                </div>
              )}
              {about.portrait_asset_id ? (
                <p className="mt-2 truncate font-mono text-[11px] text-fg-dim">asset {about.portrait_asset_id}</p>
              ) : null}
            </div>
          </section>

          {canWrite ? (
            <section className="rounded-4 border border-line bg-ink-900/60">
              <header className="border-b border-line px-5 py-3">
                <h3 className="text-[12.5px] font-medium text-fg">Replace the portrait</h3>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
                  JPG, PNG or WebP. The new file is stored in the media library and becomes the studio portrait — the old
                  file stays in the library.
                </p>
              </header>
              <form action={uploadStudioPortraitAction} className="px-5 py-4">
                <input type="hidden" name="_csrf" value={session.csrfToken} />
                <input type="hidden" name="surface" value="media" />
                <input type="hidden" name="return_to" value="/admin/media/about" />
                <input
                  name="file"
                  type="file"
                  required
                  accept="image/*"
                  className="w-full rounded-3 border border-line bg-ink-950/60 px-3 py-2 text-[12.5px] text-fg file:mr-3 file:rounded-2 file:border-0 file:bg-ink-800 file:px-2.5 file:py-1 file:text-[11.5px] file:text-fg-muted"
                />
                <div className="mt-3">
                  <SubmitButton pendingLabel="Uploading…">Upload and use</SubmitButton>
                </div>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
