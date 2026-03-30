import type { BrandingConfig } from '@/lib/validators/branding';

/**
 * Converts a #RRGGBB hex color to HSL values (no wrapper).
 * Returns a string like "222 47% 53%" suitable for CSS variable assignment.
 */
export function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${h} ${sPercent}% ${lPercent}%`;
}

/**
 * Converts a BrandingConfig to a CSS `:root` block with custom properties.
 * Returns an empty string if no colors are configured.
 */
export function brandingToCSS(branding: BrandingConfig): string {
  const vars: string[] = [];

  if (branding.primary_color) {
    vars.push(`  --primary: ${hexToHsl(branding.primary_color)};`);
  }

  if (branding.accent_color) {
    vars.push(`  --accent: ${hexToHsl(branding.accent_color)};`);
  }

  if (vars.length === 0) {
    return '';
  }

  return `:root {\n${vars.join('\n')}\n}`;
}
