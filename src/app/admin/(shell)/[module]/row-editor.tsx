import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { RowForm } from '@/components/admin/row-form';
import { ReplacePanel } from '@/components/admin/uploader';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { getCmsModule } from '@/lib/cms/modules';
import * as repo from '@/lib/cms/repository';
import { TABLES } from '@/lib/db/tables';
import { BLOCK_TYPES } from '@/lib/cms/blocks';
import { fieldDefault } from '@/lib/cms/fields';
import type { FieldDef } from '@/lib/cms/fields';

/**
 * Shared body for the “new” and “edit” screens. Everything about the form — which
 * controls exist, their validation and their groups — comes from the module registry.
 */
export async function RowEditor({ moduleKey, id }: { moduleKey: string; id: string | null }) {
  const mod = getCmsModule(moduleKey);
  if (!mod) notFound();
  const session = await readSession();
  if (!session) notFound();
  const level = levelFor(session.user.role, mod.permission ?? mod.key, await permissionsForRole(session.user.role));
  const canWrite = level === 'write' || level === 'manage';

  let values: Record<string, unknown> = {};
  if (id) {
    try {
      values = await repo.read(moduleKey, id);
    } catch {
      notFound();
    }
  } else {
    for (const field of repo.dbFields(mod)) {
      const preset = fieldDefault(field);
      if (preset !== undefined && preset !== null && preset !== '') values[field.key] = preset;
    }
    for (const [key, value] of Object.entries(mod.fixed ?? {})) values[key] = value;
  }

  const fields = repo.dbFields(mod);
  const relationFields = fields.filter((field) => field.type === 'relation' && field.module);
  const relations = Object.fromEntries(
    await Promise.all(
      relationFields.map(async (field) => [field.key, await repo.relationOptions(String(field.module), 400).catch(() => [])]),
    ),
  ) as Record<string, { value: string; label: string; meta?: string }[]>;

  const propsSchema =
    moduleKey === 'blocks'
      ? {
          when: 'block_type',
          byType: Object.fromEntries(BLOCK_TYPES.map((def) => [def.type, def.propFields as FieldDef[]])),
        }
      : undefined;

  const publicUrl = publicPathFor(mod, values);
  const pk = String(values[TABLES[mod.table].pk] ?? id ?? '');

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-[11.5px] text-fg-dim" aria-label="Breadcrumb">
        <Link href="/admin" className="hover:text-fg">
          Dashboard
        </Link>
        <Icon name="chevron-right" size={11} />
        <Link href={`/admin/${moduleKey}`} className="hover:text-fg">
          {mod.label}
        </Link>
        {id ? (
          <>
            <Icon name="chevron-right" size={11} />
            <span className="truncate text-fg-muted">{truncateLabel(values, mod.primary)}</span>
          </>
        ) : null}
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[23px] leading-tight">
            {id ? `Edit ${mod.singular.toLowerCase()}` : `New ${mod.singular.toLowerCase()}`}
          </h1>
          <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-fg-muted">
            {id ? mod.description : mod.emptyHint ?? mod.description}
          </p>
        </div>
        {moduleKey === 'pages' ? (
          <Link href={`/admin/blocks?page=${pk}`} className="rounded-2 border border-line px-3 py-1.5 text-[12px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
            Compose sections for this page
          </Link>
        ) : null}
      </header>

      {!canWrite ? (
        <p className="flex items-center gap-2 rounded-3 border border-line bg-ink-900/60 px-4 py-2.5 text-[12.5px] text-fg-muted">
          <Icon name="lock" size={13} /> Your role can view this record but not change it.
        </p>
      ) : null}

      <RowForm
        moduleKey={moduleKey}
        id={id}
        label={mod.label}
        singular={mod.singular}
        fields={fields}
        values={values}
        relations={relations}
        readOnly={!canWrite}
        publicUrl={publicUrl}
        publishedAt={values.published_at ? String(values.published_at) : null}
        updatedAt={values.updated_at ? String(values.updated_at) : values.created_at ? String(values.created_at) : null}
        isSample={values.is_sample === true || values.is_placeholder === true}
        propsSchema={propsSchema}
        deletable={id ? mod.table !== 'page' : false}
        duplicateLabel={mod.duplicate ? 'Duplicate as a draft' : undefined}
        detectable={moduleKey === 'videos' ? 'source_url' : undefined}
      />

      {id && mod.table === 'media_asset' ? (
        <ReplacePanel
          assetId={id}
          current={{
            filename: String(values.filename ?? ''),
            bytes: Number(values.bytes ?? 0),
            width: values.width == null ? null : Number(values.width),
            height: values.height == null ? null : Number(values.height),
          }}
        />
      ) : null}

      {id && mod.table === 'media_asset' && Number(values.is_referenced ?? 0) > 0 ? (
        <p className="text-[11.5px] text-fg-dim">This asset is referenced elsewhere, so deleting it is blocked until it is unlinked.</p>
      ) : null}
    </div>
  );
}

function truncateLabel(values: Record<string, unknown>, primary: string): string {
  const raw = String(values[primary] ?? 'Untitled');
  return raw.length > 44 ? `${raw.slice(0, 44)}…` : raw;
}

function publicPathFor(mod: NonNullable<ReturnType<typeof getCmsModule>>, values: Record<string, unknown>): string | null {
  const slug = values.slug ? String(values.slug) : '';
  if (mod.key === 'pages') return slug === 'home' ? '/' : `/${slug.replace(/^\/+/, '')}`;
  if (mod.publicBase && slug) return `${mod.publicBase.replace(/\/$/, '')}/${slug}`;
  if (mod.publicBase && !slug) return mod.publicBase;
  if (mod.key === 'blog' && slug) return `/blog/${slug}`;
  return null;
}
