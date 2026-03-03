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
          {/* Skip navigation for keyboard/screen reader users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
          >
            Skip to main content
          </a>

          {/* Header with navigation, user menu, command palette */}
          <Header />

          {/* Breadcrumbs */}
          <Breadcrumbs />

          {/* Main content */}
          <main id="main-content" className="container mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
            {children}
          </main>

          {/* Mobile bottom navigation */}
          <BottomNav />

          {/* Quick Add FAB */}
          <QuickAddFAB />
        </div>
      </DivisionProvider>
    </ImpersonationProvider>
  );
}
