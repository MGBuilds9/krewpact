import type { Metadata } from 'next';

import NotificationsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'View and manage your notifications and alert preferences.',
};

export default function Page() {
  return <NotificationsPageContent />;
}
