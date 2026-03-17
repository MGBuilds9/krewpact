import type { Metadata } from 'next';

import TeamPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Manage team members, roles, and division assignments.',
};

export default function Page() {
  return <TeamPageContent />;
}
