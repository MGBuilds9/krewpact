import type { Metadata } from 'next';

import MessagesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Messages',
  description: 'Communicate with your project team.',
};

export default function Page() {
  return <MessagesPageContent />;
}
