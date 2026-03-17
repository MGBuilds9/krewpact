import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KrewPact',
  description: 'Construction operations platform for MDM Group Inc.',
};

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const { userId } = await auth();
  if (!userId) redirect('/auth');
  redirect('/org/mdm-group/dashboard');
}
