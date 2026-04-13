/**
 * Construction document categories for MDM Group.
 * Used for file organization, category filtering, and empty-state CTAs.
 */

export const DOCUMENT_CATEGORIES = [
  { key: 'drawings', label: 'Drawings & Plans', icon: 'ruler' },
  { key: 'contracts', label: 'Contracts', icon: 'file-signature' },
  { key: 'rfq-bid-docs', label: 'RFQs & Bid Documents', icon: 'gavel' },
  { key: 'change-orders', label: 'Change Orders', icon: 'file-diff' },
  { key: 'submittals', label: 'Submittals', icon: 'send' },
  { key: 'photos', label: 'Photos', icon: 'camera' },
  { key: 'safety-compliance', label: 'Safety & Compliance', icon: 'shield-check' },
  { key: 'correspondence', label: 'Correspondence', icon: 'mail' },
  { key: 'invoices-financials', label: 'Invoices & Financials', icon: 'receipt' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart-3' },
] as const;

export type DocumentCategoryKey = (typeof DOCUMENT_CATEGORIES)[number]['key'];

export function getCategoryLabel(key: string): string {
  const cat = DOCUMENT_CATEGORIES.find((c) => c.key === key);
  return cat?.label ?? key;
}
