import type { Metadata } from 'next';

import MeetingsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Meeting Notes',
  description: 'View shared meeting notes and action items.',
};

export default function Page() {
  return <MeetingsPageContent />;
}
