import type { Metadata } from 'next';

import DashboardView from './_page-content';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your active projects, leads, expenses, and team activity.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
