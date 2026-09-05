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

function resolve(level: PermissionLevel | undefined, fallback: PermissionLevel): PermissionLevel {
  return level ?? fallback;
}

/**
 * Returns true when `role` may perform `required` on `module`.
 * Wildcard '*' entries act as the default; explicit entries override them.
 */
export function can(role: string | undefined, module: string, required: PermissionLevel, roleMap?: RolePermissions): boolean {
  const key = role ?? 'owner';
  const system = SYSTEM_ROLES.find((r) => r.key === key);
  const permissions: RolePermissions = roleMap ?? system?.permissions ?? { '*': 'none' };
  // Owners always win, even if the DB row is missing.
  if (key === 'owner' && !roleMap) return LEVEL_RANK.manage >= LEVEL_RANK[required];
  const specific = permissions[module];
  const wildcard = permissions['*'];
  if (specific === 'none' && wildcard && wildcard !== 'none') {
    return LEVEL_RANK[resolve(wildcard, 'none')] >= LEVEL_RANK[required];
  }
  const effective = resolve(specific, resolve(wildcard, 'none'));
  return LEVEL_RANK[effective] >= LEVEL_RANK[required];
}

export function levelFor(role: string | undefined, module: string, roleMap?: RolePermissions): PermissionLevel {
  const key = role ?? 'owner';
  const system = SYSTEM_ROLES.find((r) => r.key === key);
  const permissions: RolePermissions = roleMap ?? system?.permissions ?? { '*': 'none' };
  if (key === 'owner' && !roleMap) return 'manage';
  return permissions[module] ?? permissions['*'] ?? 'none';
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
