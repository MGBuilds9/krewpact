import type { Metadata } from 'next';

import AssembliesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Assemblies',
  description: 'Manage reusable cost assemblies for faster estimating.',
};

export default function Page() {
  return <AssembliesPageContent />;
}
