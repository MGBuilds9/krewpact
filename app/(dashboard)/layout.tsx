'use client';

import { DivisionProvider } from '@/contexts/DivisionContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { Header } from '@/components/Layout/Header';
import { Breadcrumbs } from '@/components/Layout/Breadcrumbs';
import { BottomNav } from '@/components/Layout/BottomNav';
import { QuickAddFAB } from '@/components/Layout/QuickAddFAB';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ImpersonationProvider>
      <DivisionProvider>
        <div className="min-h-screen bg-background">
          {/* Header with navigation, user menu, command palette */}
          <Header />

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Main content */}
          <main className="container mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">{children}</main>

          {/* Mobile bottom navigation */}
          <BottomNav />

          {/* Quick Add FAB */}
          <QuickAddFAB />
        </div>
      </DivisionProvider>
    </ImpersonationProvider>
  );
}
