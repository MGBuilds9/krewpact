'use client';

import { OrgProvider } from '@/contexts/OrgContext';

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>;
}
