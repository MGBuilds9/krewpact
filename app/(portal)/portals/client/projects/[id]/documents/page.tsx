import type { Metadata } from 'next';

import DocumentsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Documents',
  description: 'View shared project documents and files.',
};

export default function Page() {
  return <DocumentsPageContent />;
}
