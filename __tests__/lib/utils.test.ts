import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, null, '', 'bar')).toBe('foo bar');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('handles array syntax', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('returns empty string when no arguments', () => {
    expect(cn()).toBe('');
  });

  it('merges conflicting border classes correctly', () => {
    expect(cn('border-2', 'border-4')).toBe('border-4');
  });

  it('merges conflicting text-size classes (last wins)', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('handles mixed arrays and strings', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('handles deeply conditional object with multiple true keys', () => {
    expect(cn({ 'font-bold': true, italic: true, underline: false })).toBe('font-bold italic');
  });
});
