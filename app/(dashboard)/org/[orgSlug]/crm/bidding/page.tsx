import type { Metadata } from 'next';

import BiddingPageContent from './_page-content';

export const metadata: Metadata = {
  title: 'Bidding Opportunities',
  description: 'Browse and manage bidding opportunities from Bids & Tenders and MERX.',
};

export default function Page() {
  return <BiddingPageContent />;
}
