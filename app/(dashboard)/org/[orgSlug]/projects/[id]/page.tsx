import type { Metadata } from 'next';

import ProjectsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Project Overview',
  description: 'Project summary, team, milestones, and key metrics.',
};

export default function Page() {
  return <ProjectsPageContent />;
}
