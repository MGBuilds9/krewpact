import type { Metadata } from 'next';

import ExpensesPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Expenses',
  description: 'Submit and approve employee expense claims.',
};

export default function Page() {
  return <ExpensesPageContent />;
}
