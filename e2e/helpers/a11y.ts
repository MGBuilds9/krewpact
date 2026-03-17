import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export interface A11yCheckOptions {
  /** CSS selectors to exclude from analysis */
  exclude?: string[];
  /** Only report violations at these impact levels (default: critical, serious) */
  impactLevels?: ('critical' | 'serious' | 'moderate' | 'minor')[];
}

/**
 * Run axe-core accessibility analysis on the current page.
 * Returns only violations matching the specified impact levels.
 */
export async function checkAccessibility(page: Page, options?: A11yCheckOptions) {
  const impactLevels = options?.impactLevels ?? ['critical', 'serious'];

  let builder = new AxeBuilder({ page });

  if (options?.exclude) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector);
    }
  }

  const results = await builder.analyze();

  const violations = results.violations.filter((v) =>
    impactLevels.includes(v.impact as (typeof impactLevels)[number]),
  );

  return {
    violations,
    allViolations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
  };
}
