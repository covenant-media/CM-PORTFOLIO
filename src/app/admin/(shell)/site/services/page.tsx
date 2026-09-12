/**
 * Services.
 *
 * Quick editing at the card level — title, summary, division, status, ordering — which is
 * what decides what a visitor sees in a service grid. The deeper fields (full
 * description, process steps, deliverables, card image) live in the full editor, one
 * click away; rebuilding all of that here would be a second copy of the same form.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, Pill, EmptyState, StatCard } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { ActionButton, Field, Select, SubmitButton, TextArea, TextInput, Toggle } from '@/components/admin/controls';
import { ConfirmSubmit } from '@/components/admin/confirm';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { servicesForConsole, type ServiceRow } from '@/lib/cms/console';
import { DIVISION_OPTIONS } from '@/lib/cms/options';
import { saveServiceAction, inlineRowAction } from '@/app/admin/actions';
import { cx } from '@/lib/utils/text';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Services' };

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default async function SiteServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [services, roleMap] = await Promise.all([servicesForConsole(), permissionsForRole(session.user.role)]);
  const level = levelFor(session.user.role, 'services', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const canDelete = level === 'manage';
  const params = await searchParams;

  const grouped = DIVISION_OPTIONS.map((division) => ({
    division,
    rows: services.filter((row) => row.division === division.value),
  })).filter((group) => group.rows.length > 0);
  const ungrouped = services.filter((row) => !DIVISION_OPTIONS.some((d) => d.value === row.division));

  return (
    <>
      <PageHeader
        eyebrow="Main website"
        title="Services"
        lede="What the studio takes on. Edit the card fields here; the full editor handles the long description, process steps and image."
      />

      <Notice params={params} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Services" value={services.length} />
        <StatCard label="Published" value={services.filter((s) => s.status === 'published').length} tone="accent" />
        <StatCard label="Featured" value={services.filter((s) => s.is_featured).length} />
      </div>

      {canWrite ? (
        <section className="mb-6 rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">Add a service</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
              Title and division are enough to start. The slug is derived from the title when you leave it blank.
            </p>
          </header>
          <form action={saveServiceAction} className="grid gap-4 px-5 py-4 lg:grid-cols-2">
            <input type="hidden" name="_csrf" value={session.csrfToken} />
            <input type="hidden" name="return_to" value="/admin/site/services" />
            <TextInput label="Title" name="title" required placeholder="Videography" maxLength={80} />
            <TextInput label="Slug" name="slug" hint="optional" placeholder="videography" maxLength={80} />
            <Select label="Division" name="division" defaultValue="main" options={DIVISION_OPTIONS.map((d) => ({ value: d.value, label: d.label }))} />
            <Field label="Status" name="status">
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className="w-full appearance-none rounded-3 border border-line bg-ink-950/60 px-3 py-2 text-[13px] text-fg focus:border-[var(--accent)]/60 focus:outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="lg:col-span-2">
              <TextArea label="Summary" name="summary" rows={3} maxLength={240} placeholder="One or two sentences shown on cards." />
            </div>
            <div className="lg:col-span-2">
              <Toggle label="Featured" name="is_featured" help="Featured services lead the grid." />
            </div>
            <div className="lg:col-span-2">
              <SubmitButton pendingLabel="Adding…">Add service</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      {services.length === 0 ? (
        <EmptyState title="No services yet" hint="Add the work you actually take on — the grid on /services fills from this list." />
      ) : (
        <div className="space-y-6">
          {[...grouped, ...(ungrouped.length ? [{ division: { value: '', label: 'Other' }, rows: ungrouped }] : [])].map((group) => (
            <section key={group.division.value || 'other'}>
              <h3 className="mb-2.5 text-[13px] font-medium text-fg">
                {group.division.label} <span className="text-[11.5px] text-fg-dim">{group.rows.length}</span>
              </h3>
              <ul className="space-y-2.5">
                {group.rows.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    csrf={session.csrfToken}
                    canWrite={canWrite}
                    canDelete={canDelete}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function ServiceCard({
  service,
  csrf,
  canWrite,
  canDelete,
}: {
  service: ServiceRow;
  csrf: string;
  canWrite: boolean;
  canDelete: boolean;
}) {
  return (
    <li className={cx('rounded-4 border bg-ink-900/60', service.is_featured ? 'border-[var(--accent)]/40' : 'border-line')}>
      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px] text-fg">
            {service.title}
            {service.is_featured ? <Icon name="star" size={12} className="text-[var(--accent)]" title="Featured" /> : null}
          </p>
          {service.summary ? <p className="mt-0.5 line-clamp-2 text-[12px] text-fg-muted">{service.summary}</p> : null}
          <p className="mt-1 font-mono text-[11px] text-fg-dim">/services/{service.slug}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Pill tone={service.status === 'published' ? 'ok' : service.status === 'archived' ? 'neutral' : 'warn'}>{service.status}</Pill>
          {canWrite ? (
            <>
              <form action={inlineRowAction}>
                <input type="hidden" name="_csrf" value={csrf} />
                <input type="hidden" name="module" value="services" />
                <input type="hidden" name="id" value={service.id} />
                <input type="hidden" name="op" value={service.status === 'published' ? 'draft' : 'publish'} />
                <ActionButton pendingLabel="…">{service.status === 'published' ? 'Unpublish' : 'Publish'}</ActionButton>
              </form>
              <form action={inlineRowAction}>
                <input type="hidden" name="_csrf" value={csrf} />
                <input type="hidden" name="module" value="services" />
                <input type="hidden" name="id" value={service.id} />
                <input type="hidden" name="op" value={service.is_featured ? 'unfeature' : 'feature'} />
                <ActionButton variant={service.is_featured ? 'accent' : 'ghost'} pendingLabel="…">
                  {service.is_featured ? 'Unfeature' : 'Feature'}
                </ActionButton>
              </form>
            </>
          ) : null}
          <Link
            href={`/admin/services/${service.id}`}
            className="inline-flex items-center gap-1 rounded-2 border border-line px-2 py-[3px] text-[11.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/45 hover:text-fg"
          >
            Full editor <Icon name="arrow-right" size={10} />
          </Link>
        </div>
      </div>

      {canWrite ? (
        <details className="border-t border-line">
          <summary className="cursor-pointer list-none px-4 py-2 text-[11.5px] text-fg-dim hover:text-fg-muted">Quick edit</summary>
          <div className="border-t border-line/60 px-4 py-4">
            <form action={saveServiceAction} className="grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="_csrf" value={csrf} />
              <input type="hidden" name="id" value={service.id} />
              <input type="hidden" name="return_to" value="/admin/site/services" />
              <TextInput label="Title" name="title" defaultValue={service.title} required maxLength={80} />
              <TextInput label="Slug" name="slug" defaultValue={service.slug} maxLength={80} />
              <Select label="Division" name="division" defaultValue={service.division} options={DIVISION_OPTIONS.map((d) => ({ value: d.value, label: d.label }))} />
              <Select label="Status" name="status" defaultValue={service.status} options={STATUS_OPTIONS} />
              <div className="lg:col-span-2">
                <TextArea label="Summary" name="summary" rows={3} defaultValue={service.summary} maxLength={240} />
              </div>
              <TextInput label="Order" name="sort_order" type="number" defaultValue={String(service.sort_order)} />
              <Toggle label="Featured" name="is_featured" defaultChecked={service.is_featured} />
              <div className="lg:col-span-2">
                <SubmitButton>Save changes</SubmitButton>
              </div>
            </form>
            {canDelete ? (
              <form action={inlineRowAction} className="mt-3 border-t border-line/60 pt-3">
                <input type="hidden" name="_csrf" value={csrf} />
                <input type="hidden" name="module" value="services" />
                <input type="hidden" name="id" value={service.id} />
                <input type="hidden" name="op" value="delete" />
                <ConfirmSubmit message={`Delete the service “${service.title}”? This cannot be undone.`}>Delete</ConfirmSubmit>
              </form>
            ) : null}
          </div>
        </details>
      ) : null}
    </li>
  );
}
