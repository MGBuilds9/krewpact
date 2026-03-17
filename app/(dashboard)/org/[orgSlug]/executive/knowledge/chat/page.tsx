import type { Metadata } from 'next';

import ChatPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Knowledge Chat',
  description: 'Chat with the MDM Group knowledge base using natural language.',
};

export default function Page() {
  return <ChatPageContent />;
}
