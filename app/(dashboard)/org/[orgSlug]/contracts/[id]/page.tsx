import type { Metadata } from 'next';

import ContractsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Contract Details',
  description: 'View and manage contract terms, amendments, and signatures.',
};

export default function Page() {
  return <ContractsPageContent />;
}
