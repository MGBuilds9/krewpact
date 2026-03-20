import type { Metadata } from 'next';

import FleetPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Fleet Vehicles',
  description: 'Manage fleet vehicles and mobile inventory locations.',
};

export default function Page() {
  return <FleetPageContent />;
}
