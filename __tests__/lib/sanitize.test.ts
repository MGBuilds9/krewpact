import { describe, expect, it } from 'vitest';

import { nullableSafeString, optionalSafeString, safeString, sanitizeText } from '@/lib/sanitize';

describe('sanitizeText', () => {
  it('strips HTML script tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('strips img onerror', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('strips javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
  });

  it('strips event handlers', () => {
    expect(sanitizeText('text onclick=alert(1) more')).toBe('text alert(1) more');
  });

  it('strips nested tags', () => {
    expect(sanitizeText('<div><script>bad</script></div>')).toBe('bad');
  });

  it('preserves normal text', () => {
    expect(sanitizeText('MDM Group Inc.')).toBe('MDM Group Inc.');
  });

  it('preserves ampersands and special chars', () => {
    expect(sanitizeText('Tom & Jerry, LLC')).toBe('Tom & Jerry, LLC');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
});

describe('safeString', () => {
  it('validates and sanitizes', () => {
    const schema = safeString();
    const result = schema.parse('<b>bold</b> text');
    expect(result).toBe('bold text');
  });

  it('rejects non-string input', () => {
    const schema = safeString();
    expect(() => schema.parse(42)).toThrow();
  });

  it('passes plain text through unchanged', () => {
    const schema = safeString();
    expect(schema.parse('Hello, world!')).toBe('Hello, world!');
  });
});

describe('optionalSafeString', () => {
  it('accepts a string value and sanitizes', () => {
    const schema = optionalSafeString();
    expect(schema.parse('<em>italics</em>')).toBe('italics');
  });

  it('accepts undefined', () => {
    const schema = optionalSafeString();
    expect(schema.parse(undefined)).toBeUndefined();
  });
});

describe('nullableSafeString', () => {
  it('accepts null', () => {
    const schema = nullableSafeString();
    expect(schema.parse(null)).toBeNull();
  });

  it('accepts undefined', () => {
    const schema = nullableSafeString();
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('sanitizes a string value', () => {
    const schema = nullableSafeString();
    expect(schema.parse('<div>content</div>')).toBe('content');
  });
});
