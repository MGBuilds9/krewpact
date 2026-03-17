import type { Metadata } from 'next';

import SchedulePageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'View the project calendar, milestones, and upcoming deadlines.',
};

export default function Page() {
  return <SchedulePageContent />;
}
