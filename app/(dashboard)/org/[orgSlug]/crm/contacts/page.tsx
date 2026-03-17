import type { Metadata } from 'next';

import ContactsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Contacts',
  description: 'Manage contacts and their relationships with accounts.',
};

export default function Page() {
  return <ContactsPageContent />;
}
