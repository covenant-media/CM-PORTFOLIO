/**
 * Password hashing: scrypt (memory-hard, in Node core — no native build step).
 * Format: scrypt$N$r$p$salt$hash
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'; {
}

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { ...opts, maxmem: 128 * 1024 * 1024 }, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize('NFKC'), salt, PARAMS.keylen, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), derived.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  try {
    const expected = Buffer.from(hashB64, 'base64');
    const derived = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 12) issues.push('Use at least 12 characters');
  if (!/[A-Za-z]/.test(password)) issues.push('Include at least one letter');
  if (!/[0-9]/.test(password)) issues.push('Include at least one number');
  const lower = password.toLowerCase();
  const weak = ['covenant', 'password', '123456', 'qwerty', 'admin123', 'letmein', 'welcome'];
  if (weak.some((w) => lower.includes(w))) issues.push('Avoid common words such as "covenant" or "password"');
  return issues;
}
