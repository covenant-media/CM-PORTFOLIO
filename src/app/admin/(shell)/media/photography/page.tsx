/**
 * Event photography.
 *
 * Uploads go through the same ingest path the media library uses — bytes sniffed, image
 * decoded, variants generated, checksum stored — so a photograph added here is the same
 * kind of record as one added there, and it is served from the same /uploads route.
 * The only thing this screen adds is the folder: everything uploaded here is tagged
 * `event-photography` so the media surface can find it.
 */
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, EmptyState, StatCard, bytesLabel } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { SubmitButton, TextArea, TextInput } from '@/components/admin/controls';
import { ConfirmSubmit } from '@/components/admin/confirm';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { eventPhotos } from '@/lib/cms/console';
import { uploadLimits } from '@/lib/media/storage';
import { eventPhotoAction, uploadEventPhotoAction } from '@/app/admin/actions';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Event photography' };

export default async function MediaPhotographyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [photos, roleMap] = await Promise.all([eventPhotos(), permissionsForRole(session.user.role)]);
  const level = levelFor(session.user.role, 'media_library', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const params = await searchParams;
  const { maxBytes } = uploadLimits();

  return (
    <>
      <PageHeader
        eyebrow="Media portfolio"
        title="Event photography"
        lede="Upload photographs straight from the console. They are stored in the media library under the event-photography folder and served from /uploads."
      />

      <Notice params={params} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Photographs" value={photos.length} />
        <StatCard label="Total size" value={bytesLabel(photos.reduce((n, p) => n + p.bytes, 0))} />
        <StatCard label="Upload limit" value={`${Math.round(maxBytes / 1024 / 1024)} MB`} hint="per file" />
      </div>

      {canWrite ? (
        <section className="mb-6 rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">Upload photographs</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
              JPG, PNG, WebP, AVIF or GIF. Several at once is fine — the alt text below is applied when you upload a single
              image.
            </p>
          </header>
          <form action={uploadEventPhotoAction} className="px-5 py-4">
            <input type="hidden" name="_csrf" value={session.csrfToken} />
            <input type="hidden" name="return_to" value="/admin/media/photography" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="files" className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-fg-dim">
                  Photographs
                </label>
                <input
                  id="files"
                  name="files"
                  type="file"
                  multiple
                  required
                  accept="image/*"
                  className="w-full rounded-3 border border-line bg-ink-950/60 px-3 py-2 text-[12.5px] text-fg file:mr-3 file:rounded-2 file:border-0 file:bg-ink-800 file:px-2.5 file:py-1 file:text-[11.5px] file:text-fg-muted"
                />
              </div>
              <TextInput label="Alt text" name="alt" hint="single upload" placeholder="Couple during the ceremony" maxLength={180} help="Describes the image for screen readers." />
            </div>
            <div className="mt-4">
              <TextArea label="Caption" name="caption" rows={2} placeholder="Optional — shown with the photograph." maxLength={240} />
            </div>
            <div className="mt-4">
              <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      {photos.length === 0 ? (
        <EmptyState
          title="No event photographs yet"
          hint="Anything you upload here appears in the photography wall on /media once the public page is reading the console."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="overflow-hidden rounded-4 border border-line bg-ink-900/60">
              <div className="relative aspect-[4/3] bg-ink-1000">
                <img src={photo.url} alt={photo.alt || ''} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="px-3.5 py-3">
                <p className="truncate text-[12px] text-fg">{photo.caption || photo.title || photo.filename}</p>
                <p className="mt-0.5 text-[11px] text-fg-dim">
                  {photo.width && photo.height ? `${photo.width}×${photo.height} · ` : ''}
                  {bytesLabel(photo.bytes)}
                </p>
                {canWrite ? (
                  <details className="mt-2.5 border-t border-line pt-2.5">
                    <summary className="cursor-pointer list-none text-[11.5px] text-fg-dim hover:text-fg-muted">Edit or remove</summary>
                    <form action={eventPhotoAction} className="mt-2.5 space-y-2.5">
                      <input type="hidden" name="_csrf" value={session.csrfToken} />
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="op" value="meta" />
                      <input type="hidden" name="return_to" value="/admin/media/photography" />
                      <TextInput label="Title" name="title" defaultValue={photo.title} maxLength={140} />
                      <TextInput label="Alt text" name="alt" defaultValue={photo.alt} maxLength={180} />
                      <TextArea label="Caption" name="caption" rows={2} defaultValue={photo.caption} maxLength={240} />
                      <SubmitButton variant="ghost" pendingLabel="Saving…">
                        Save details
                      </SubmitButton>
                    </form>
                    <form action={eventPhotoAction} className="mt-2.5 border-t border-line pt-2.5">
                      <input type="hidden" name="_csrf" value={session.csrfToken} />
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="op" value="delete" />
                      <input type="hidden" name="return_to" value="/admin/media/photography" />
                      <ConfirmSubmit message="Remove this photograph? Anywhere it is used will fall back to its own default.">
                        <Icon name="trash" size={11} /> Remove
                      </ConfirmSubmit>
                    </form>
                  </details>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
