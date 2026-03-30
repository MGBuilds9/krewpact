import { describe, expect, it } from 'vitest';

import { brandingToCSS, hexToHsl } from '@/lib/tenant/branding-css';

describe('hexToHsl', () => {
  it('converts pure red to 0 100% 50%', () => {
    expect(hexToHsl('#ff0000')).toBe('0 100% 50%');
  });

  it('converts black to 0 0% 0%', () => {
    expect(hexToHsl('#000000')).toBe('0 0% 0%');
  });
});

describe('brandingToCSS', () => {
  it('returns empty string for empty config', () => {
    expect(brandingToCSS({})).toBe('');
  });

  it('returns :root block with --primary when primary_color is set', () => {
    const css = brandingToCSS({ primary_color: '#2563eb' });
    expect(css).toContain(':root');
    expect(css).toContain('--primary:');
  });

  it('returns both --primary and --accent when both colors are set', () => {
    const css = brandingToCSS({ primary_color: '#ff0000', accent_color: '#00ff00' });
    expect(css).toContain('--primary:');
    expect(css).toContain('--accent:');
  });
});
