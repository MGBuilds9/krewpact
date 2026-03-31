/**
 * KrewPact — Branded email templates.
 * Aggregates all template categories and exports utility functions.
 */

export { EVENT_TEMPLATES } from './templates/event';
export { FOLLOW_UP_TEMPLATES } from './templates/follow-up';
export { OUTREACH_TEMPLATES } from './templates/outreach';
export { REFERRAL_TEMPLATES } from './templates/referral';
export type { BrandedTemplate } from './templates/shared';

import { EVENT_TEMPLATES } from './templates/event';
import { FOLLOW_UP_TEMPLATES } from './templates/follow-up';
import { OUTREACH_TEMPLATES } from './templates/outreach';
import { REFERRAL_TEMPLATES } from './templates/referral';
import type { BrandedTemplate } from './templates/shared';

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
