import type { Metadata } from 'next';

import OnboardingPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Trade Onboarding',
  description: 'Complete your trade partner onboarding and compliance requirements.',
};

export default function Page() {
  return <OnboardingPageContent />;
}
