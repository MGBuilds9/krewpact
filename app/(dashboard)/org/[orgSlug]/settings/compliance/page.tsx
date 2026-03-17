import type { Metadata } from 'next';

import CompliancePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Compliance Settings',
  description: 'Configure PIPEDA, AODA, and Construction Act compliance settings.',
};

export default function Page() {
  return <CompliancePageContent />;
}
