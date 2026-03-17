import type { Metadata } from 'next';

import SettingsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'CRM Settings',
  description: 'Configure CRM preferences, integrations, and automation rules.',
};

export default function Page() {
  return <SettingsPageContent />;
}
