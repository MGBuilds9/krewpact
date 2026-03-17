import type { Metadata } from 'next';

import CostCodesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Cost Codes',
  description: 'Manage cost codes and their ERPNext mappings.',
};

export default function Page() {
  return <CostCodesPageContent />;
}
