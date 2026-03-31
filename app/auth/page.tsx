import type { Metadata } from 'next';

import AuthPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to KrewPact',
};

export default function Page() {
  return <AuthPageContent />;
}
