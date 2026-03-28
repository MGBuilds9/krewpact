'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { Menu, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { MDMLogo } from '@/components/ui/MDMLogo';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useUserRBAC } from '@/hooks/useRBAC';

import { DivisionSelector } from './DivisionSelector';
import { ImpersonationBanner, SettingsDropdown, ThemeToggle, UserDropdown } from './HeaderParts';
import { ImpersonationSelector } from './ImpersonationSelector';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';
import { Navigation } from './Navigation';
import { QuickAccessToolbar } from './QuickAccessToolbar';
import { ShortcutsHelpOverlay } from './ShortcutsHelpOverlay';

const CommandPalette = dynamic(
  () => import('./CommandPalette').then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);

interface HeaderBarProps {
  userName: string;
  userImageUrl: string;
  userEmail?: string;
  isAdmin: boolean;
  orgPush: (path: string) => void;
  onMobileMenuOpen: () => void;
  onCommandPaletteOpen: () => void;
  onImpersonateOpen: () => void;
  onSignOut: () => void;
}

function HeaderBar({
  userName,
  userImageUrl,
  userEmail,
  isAdmin,
  orgPush,
  onMobileMenuOpen,
  onCommandPaletteOpen,
  onImpersonateOpen,
  onSignOut,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm transition-colors duration-200">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={onMobileMenuOpen}
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 shrink-0 group cursor-pointer hover:opacity-80 transition-opacity">
              <MDMLogo size="md" showText={true} />
            </div>
            <nav className="hidden md:flex items-center flex-1 min-w-0">
              <Navigation />
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <DivisionSelector className="hidden md:flex" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onCommandPaletteOpen}
              className="hover:bg-muted rounded-lg transition-colors duration-200"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <SettingsDropdown isAdmin={isAdmin} onImpersonate={onImpersonateOpen} onNav={orgPush} />
            <UserDropdown
              userName={userName}
              userImageUrl={userImageUrl}
              userEmail={userEmail}
              onNav={orgPush}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { push: orgPush } = useOrgRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = React.useState(false);
  const [isImpersonationOpen, setIsImpersonationOpen] = React.useState(false);

  const { isImpersonating, stopImpersonation } = useImpersonation();
  const { isAdmin } = useUserRBAC();
  const userName = user ? `${user.firstName} ${user.lastName}` : '';
  const showQuickAccessToolbar = !pathname.endsWith('/dashboard') && pathname !== '/';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  useKeyboardShortcuts(
    [
      { key: 'k', metaKey: true, handler: () => setIsCommandPaletteOpen((prev) => !prev) },
      {
        key: '/',
        metaKey: true,
        handler: () => setIsShortcutsHelpOpen((prev) => !prev),
        ignoreInputs: false,
      },
      { key: 'n', handler: () => orgPush('/crm/leads/new') },
    ],
    [
      { firstKey: 'g', secondKey: 'l', handler: () => orgPush('/crm/leads') },
      { firstKey: 'g', secondKey: 'p', handler: () => orgPush('/projects') },
      { firstKey: 'g', secondKey: 'e', handler: () => orgPush('/estimates') },
      { firstKey: 'g', secondKey: 'd', handler: () => orgPush('/dashboard') },
    ],
  );

  return (
    <>
      {isImpersonating && <ImpersonationBanner onStop={stopImpersonation} />}
      <HeaderBar
        userName={userName}
        userImageUrl={user?.imageUrl ?? ''}
        userEmail={user?.primaryEmailAddress?.emailAddress}
        isAdmin={isAdmin}
        orgPush={orgPush}
        onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        onCommandPaletteOpen={() => setIsCommandPaletteOpen(true)}
        onImpersonateOpen={() => setIsImpersonationOpen(true)}
        onSignOut={handleSignOut}
      />
      {showQuickAccessToolbar && <QuickAccessToolbar />}
      {isMobileMenuOpen && (
        <MobileNavigationDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
      {isCommandPaletteOpen && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      )}
      {isShortcutsHelpOpen && (
        <ShortcutsHelpOverlay
          isOpen={isShortcutsHelpOpen}
          onClose={() => setIsShortcutsHelpOpen(false)}
        />
      )}
      {isAdmin && isImpersonationOpen && (
        <ImpersonationSelector open={isImpersonationOpen} onOpenChange={setIsImpersonationOpen} />
      )}
    </>
  );
}
