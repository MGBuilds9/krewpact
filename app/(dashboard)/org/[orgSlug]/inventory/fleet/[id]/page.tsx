import type { Metadata } from 'next';

import FleetDetailPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Vehicle Details',
  description: 'View and manage fleet vehicle details.',
};

export default function Page() {
  return <FleetDetailPageContent />;
}
