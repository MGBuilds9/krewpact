import type { Metadata } from 'next';

import AuthPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to KrewPact, the construction operations platform for MDM Group Inc.',
};

export default function Page() {
  return <AuthPageContent />;
}
