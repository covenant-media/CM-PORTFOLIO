/**
 * Authorization layer.
 *
 * One administrator exists today, but every permission check resolves through the
 * role table so additional roles (editor, media editor, viewer) can be added from
 * the CMS later without a rewrite (PRD §9 / §23).
 */

export type PermissionLevel = 'none' | 'read' | 'write' | 'manage';

export const CMS_MODULE_KEYS = [
  'pages',
  'blocks',
  'navigation',
  'settings',
  'social_links',
  'services',
  'team',
  'testimonials',
  'media_projects',
  'videos',
  'photos',
  'galleries',
  'media_library',
  'tech_projects',
  'skills',
  'experience',
  'certifications',
  'resume',
  'pricing',
  'contact_info',
  'blog',
  'seo',
  'submissions',
  'featured',
  'account',
] as const;

export type ModuleKey = (typeof CMS_MODULE_KEYS)[number];

const LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, read: 1, write: 2, manage: 3 };

export interface RolePermissions {
  [module: string]: PermissionLevel;
}

export const SYSTEM_ROLES: { key: string; label: string; description: string; permissions: RolePermissions }[] = [
  {
    key: 'owner',
    label: 'Owner',
    description: 'Full control of content, settings and accounts.',
    permissions: { '*': 'manage' },
  },
  {
    key: 'editor',
    label: 'Editor',
    description: 'Creates and publishes content. Cannot change system settings or users.',
    permissions: {
      '*': 'write',
      settings: 'read',
      seo: 'write',
      account: 'none',
      submissions: 'write',
    },
  },
  {
    key: 'media_editor',
    label: 'Media editor',
    description: 'Only the media portfolio: projects, videos, galleries, media library.',
    permissions: {
      '*': 'none',
      media_projects: 'write',
      videos: 'write',
      photos: 'write',
      galleries: 'write',
      media_library: 'write',
      blocks: 'read',
      pages: 'read',
      testimonials: 'write',
      featured: 'write',
    },
  },
  {
    key: 'viewer',
    label: 'Viewer',
    description: 'Read-only access for collaborators reviewing content.',
    permissions: { '*': 'read', account: 'none', settings: 'read' },
  },
];

/**
 * The effective level a role holds on one module.
 *
 * Wildcard `*` entries are the default for a role; an explicit entry for a module overrides the
 * wildcard *including* `none`, which is how an owner locks a section (account, settings) against
 * an otherwise capable role. A role nobody recognises — or a session whose user row has no role —
 * resolves to `none`: authorization fails closed, because the alternative is a default of access.
 */
function effectiveLevel(role: string | undefined, module: string, roleMap?: RolePermissions): PermissionLevel {
  const key = role ?? '';
  // The owner keeps control even if the role table was never seeded or wiped mid-session.
  if (key === 'owner' && !roleMap) return 'manage';
  const system = SYSTEM_ROLES.find((r) => r.key === key);
  const permissions = roleMap ?? system?.permissions;
  if (!permissions) return 'none';
  return permissions[module] ?? permissions['*'] ?? 'none';
}

/**
 * Returns true when `role` may perform `required` on `module`.
 * Called on every CMS mutation — the UI hides what it cannot do, the server refuses it.
 */
export function can(role: string | undefined, module: string, required: PermissionLevel, roleMap?: RolePermissions): boolean {
  return LEVEL_RANK[effectiveLevel(role, module, roleMap)] >= LEVEL_RANK[required];
}

export function levelFor(role: string | undefined, module: string, roleMap?: RolePermissions): PermissionLevel {
  return effectiveLevel(role, module, roleMap);
}

export function permissionLabel(level: PermissionLevel): string {
  switch (level) {
    case 'manage':
      return 'Full control';
    case 'write':
      return 'Create, edit and publish';
    case 'read':
      return 'View only';
    default:
      return 'No access';
  }
}
