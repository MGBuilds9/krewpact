import type { Metadata } from 'next';

import SubscriptionsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Alert Subscriptions',
  description: 'Manage executive alert subscriptions and notification preferences.',
};

export default function Page() {
  return <SubscriptionsPageContent />;
}
