import type { Metadata } from 'next';

import DashboardView from './DashboardView';

export const metadata: Metadata = {
  title: 'Dashboard — KrewPact',
  description: 'Overview of your active projects, leads, expenses, and team activity.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
