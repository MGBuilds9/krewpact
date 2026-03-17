import type { Metadata } from 'next';

import BiddingPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Bid Details',
  description: 'View bidding opportunity details, documents, and submission status.',
};

export default function Page({ params }: { params: Promise<{ id: string; orgSlug: string }> }) {
  return <BiddingPageContent params={params} />;
}
