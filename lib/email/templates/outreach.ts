/**
 * Outreach email templates barrel.
 * Aggregates: outreach-portfolio (project-showcase, video-intro, capability-deck)
 *             outreach-prospecting (seasonal-outreach, trade-partner-invite)
 */

export { OUTREACH_PORTFOLIO_TEMPLATES } from './outreach-portfolio';
export { OUTREACH_PROSPECTING_TEMPLATES } from './outreach-prospecting';

import { OUTREACH_PORTFOLIO_TEMPLATES } from './outreach-portfolio';
import { OUTREACH_PROSPECTING_TEMPLATES } from './outreach-prospecting';

export const OUTREACH_TEMPLATES = [
  ...OUTREACH_PORTFOLIO_TEMPLATES,
  ...OUTREACH_PROSPECTING_TEMPLATES,
];
