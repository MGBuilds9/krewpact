/**
 * MDM Group Inc. — Branded email templates.
 * Re-exports everything from lib/email/templates/ for backward compatibility.
 */

export {
  BRANDED_TEMPLATES,
  EVENT_TEMPLATES,
  FOLLOW_UP_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  OUTREACH_TEMPLATES,
  REFERRAL_TEMPLATES,
} from './templates/index';
export type { BrandedTemplate } from './templates/shared';
