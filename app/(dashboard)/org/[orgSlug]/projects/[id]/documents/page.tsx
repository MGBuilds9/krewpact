import type { Metadata } from 'next';

import DocumentsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Documents',
  description: 'Project files, folders, and document management.',
};

export default function Page() {
  return <DocumentsPageContent />;
}
