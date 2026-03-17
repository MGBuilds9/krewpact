import type { Metadata } from 'next';

import ContactsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Contact Details',
  description: 'View contact details, activity history, and communication preferences.',
};

export default function Page() {
  return <ContactsPageContent />;
}
