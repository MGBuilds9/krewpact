import type { Metadata } from 'next';

import LocationsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Inventory Locations',
  description: 'Warehouses, job sites, and vehicle storage locations.',
};

export default function Page() {
  return <LocationsPageContent />;
}
