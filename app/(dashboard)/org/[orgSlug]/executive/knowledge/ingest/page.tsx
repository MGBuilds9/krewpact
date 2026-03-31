import type { Metadata } from 'next';

import IngestPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Ingest Knowledge',
  description: 'Upload and embed documents into the organizational knowledge base.',
};

export default function Page() {
  return <IngestPageContent />;
}
