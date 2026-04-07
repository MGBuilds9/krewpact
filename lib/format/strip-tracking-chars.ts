/**
 * Strips zero-width/invisible unicode characters that email marketing tools
 * inject for open-tracking and spam evasion. These characters pollute
 * `message.bodyPreview` / subject line strings from Microsoft Graph and
 * render as garbled whitespace in the inbox widget.
 *
 * Ranges covered:
 * - U+00AD (SOFT HYPHEN)
 * - U+034F (COMBINING GRAPHEME JOINER)
 * - U+200B..U+200F (ZWSP, ZWNJ, ZWJ, LRM, RLM)
 * - U+2060 (WORD JOINER)
 * - U+FEFF (ZERO WIDTH NO-BREAK SPACE / BOM)
 *
 * Use on any text that originated from an email body/subject before rendering
 * it in the UI. Do NOT use on user-typed content — it would silently strip
 * soft hyphens that a user intentionally inserted.
 */
export function stripTrackingChars(input: string): string {
  return input.replace(/[\u00AD\u034F\u200B-\u200F\u2060\uFEFF]/g, '');
}
