import type { Metadata } from 'next';

import SurveyPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Satisfaction Survey',
  description: 'Share your feedback on the project.',
};

export default function Page() {
  return <SurveyPageContent />;
}
