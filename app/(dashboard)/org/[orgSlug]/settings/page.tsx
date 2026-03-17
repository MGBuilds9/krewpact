import type { Metadata } from 'next';

import SettingsPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Organization settings and configuration.',
};

export default function Page() {
  return <SettingsPageContent />;
}
