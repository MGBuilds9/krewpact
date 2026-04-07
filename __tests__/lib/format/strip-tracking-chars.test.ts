import { describe, expect, it } from 'vitest';

import { stripTrackingChars } from '@/lib/format/strip-tracking-chars';

describe('stripTrackingChars', () => {
  it('leaves ordinary text untouched', () => {
    expect(stripTrackingChars('Hello, world!')).toBe('Hello, world!');
  });

  it('strips zero-width space (U+200B)', () => {
    expect(stripTrackingChars('Hi\u200Bthere')).toBe('Hithere');
  });

  it('strips zero-width non-joiner (U+200C)', () => {
    expect(stripTrackingChars('Hi\u200Cthere')).toBe('Hithere');
  });

  it('strips zero-width joiner (U+200D)', () => {
    expect(stripTrackingChars('Hi\u200Dthere')).toBe('Hithere');
  });

  it('strips LRM and RLM (U+200E/U+200F)', () => {
    expect(stripTrackingChars('a\u200Eb\u200Fc')).toBe('abc');
  });

  it('strips soft hyphen (U+00AD)', () => {
    expect(stripTrackingChars('hy\u00ADphen')).toBe('hyphen');
  });

  it('strips combining grapheme joiner (U+034F)', () => {
    expect(stripTrackingChars('x\u034Fy')).toBe('xy');
  });

  it('strips word joiner (U+2060)', () => {
    expect(stripTrackingChars('a\u2060b')).toBe('ab');
  });

  it('strips BOM / ZWNBSP (U+FEFF)', () => {
    expect(stripTrackingChars('\uFEFFRBC Statement Ready')).toBe('RBC Statement Ready');
  });

  it('strips a realistic marketing-email subject with multiple tracking chars', () => {
    // Real-world pattern: tracking chars sprinkled between letters.
    const polluted = 'O\u200Bpen \u200Cyour \u200Dstatement';
    expect(stripTrackingChars(polluted)).toBe('Open your statement');
  });

  it('returns empty string when input is only tracking chars', () => {
    expect(stripTrackingChars('\u200B\u200C\u200D\u2060')).toBe('');
  });

  it('handles the empty string', () => {
    expect(stripTrackingChars('')).toBe('');
  });
});
