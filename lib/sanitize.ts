import { z } from 'zod';

/**
 * Strip HTML tags from text input as defense-in-depth.
 * React auto-escapes on render, but this protects the DB layer.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/** Zod string that strips HTML. Use for user-facing text fields. */
export function safeString() {
  return z.string().transform(sanitizeText);
}

/** Optional safe string. */
export function optionalSafeString() {
  return z
    .string()
    .transform(sanitizeText)
    .optional();
}

/** Nullable optional safe string. */
export function nullableSafeString() {
  return z
    .string()
    .transform(sanitizeText)
    .optional()
    .nullable();
}
