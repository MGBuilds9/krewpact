/**
 * MDM Group Inc. — Email template registry.
 * Aggregates all template categories and exports utility functions.
 */

export { EVENT_TEMPLATES } from './event';
export { FOLLOW_UP_TEMPLATES } from './follow-up';
export { OUTREACH_TEMPLATES } from './outreach';
export { REFERRAL_TEMPLATES } from './referral';
export type { BrandedTemplate } from './shared';

import { EVENT_TEMPLATES } from './event';
import { FOLLOW_UP_TEMPLATES } from './follow-up';
import { OUTREACH_TEMPLATES } from './outreach';
import { REFERRAL_TEMPLATES } from './referral';
import type { BrandedTemplate } from './shared';

export const BRANDED_TEMPLATES: BrandedTemplate[] = [
  ...OUTREACH_TEMPLATES,
  ...FOLLOW_UP_TEMPLATES,
  ...EVENT_TEMPLATES,
  ...REFERRAL_TEMPLATES,
];

export function getTemplateById(id: string): BrandedTemplate | undefined {
  return BRANDED_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: BrandedTemplate['category']): BrandedTemplate[] {
  return BRANDED_TEMPLATES.filter((t) => t.category === category);
}
