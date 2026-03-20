import type { Metadata } from 'next';

import EnrollmentApprovalsPage from './_page-content';

export const metadata: Metadata = {
  title: 'Enrollment Approvals',
  description: 'Review and approve leads before they enter outreach sequences.',
};

export default function Page() {
  return <EnrollmentApprovalsPage />;
}
