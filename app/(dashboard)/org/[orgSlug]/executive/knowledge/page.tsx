import type { Metadata } from 'next';

import KnowledgePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Knowledge Base',
  description: 'Search the MDM Group knowledge base powered by AI embeddings.',
};

export default function Page() {
  return <KnowledgePageContent />;
}
