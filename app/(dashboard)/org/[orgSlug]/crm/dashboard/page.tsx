import type { Metadata } from 'next';

import DashboardPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'CRM Dashboard',
  description: 'Pipeline metrics, win rates, activity feed, and sales performance.',
};

export default function Page() {
  return <DashboardPageContent />;
}
