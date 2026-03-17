import type { Metadata } from 'next';

import DocumentsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Manage project documents, files, and folders across all divisions.',
};

export default function Page() {
  return <DocumentsPageContent />;
}
