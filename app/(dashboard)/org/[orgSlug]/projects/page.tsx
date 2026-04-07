import type { Metadata } from 'next';

import ProjectsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'View and manage all active and planned construction projects.',
};

export default function ProjectsPage() {
  return <ProjectsPageContent />;
}
