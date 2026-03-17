import type { Metadata } from 'next';

import ProjectsView from './ProjectsView';

export const metadata: Metadata = {
  title: 'Projects — KrewPact',
  description: 'View and manage all active and planned construction projects.',
};

export default function ProjectsPage() {
  return <ProjectsView />;
}
