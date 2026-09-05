import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next still ships eslintrc-style configs, so they are bridged into flat config
// here. Everything below is deliberately narrow: rules that catch real mistakes in this
// codebase, and nothing that would turn into style noise.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      'next-env.d.ts',
      '.next/**',
      'out/**',
      'dist/**',
      'node_modules/**',
      '.cm-data/**',
      '.cm-backups/**',
      'public/**',
      'src/lib/db/schema.sql.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Server actions and the CMS write path rely on stable identities.
      'react-hooks/exhaustive-deps': 'warn',
      // The repository returns `unknown` rows on purpose; the guards narrow them.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@next/next/no-img-element': 'off',
      // In this codebase `module` is always a CMS content-module definition, and the rule
      // cannot tell that apart from the CommonJS global it was written for.
      '@next/next/no-assign-module-variable': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },
];

export default eslintConfig;
