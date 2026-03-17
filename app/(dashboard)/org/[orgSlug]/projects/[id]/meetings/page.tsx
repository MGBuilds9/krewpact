import type { Metadata } from 'next';

import MeetingsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Meetings',
  description: 'Schedule and track project meetings and minutes.',
};

export default function Page() {
  return <MeetingsPageContent />;
}
