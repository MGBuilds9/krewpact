'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { Bell, Eye, LogOut, Menu, MoreHorizontal, Settings, User, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

import { NotificationBell } from '@/components/Notifications/NotificationBell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MDMLogo } from '@/components/ui/MDMLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useUserRBAC } from '@/hooks/useRBAC';

const CommandPalette = dynamic(
  () => import('./CommandPalette').then((m) => ({ default: m.CommandPalette })),
  { ssr: false },
);
import { DivisionSelector } from './DivisionSelector';
import { ImpersonationSelector } from './ImpersonationSelector';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';
import { Navigation } from './Navigation';
import { QuickAccessToolbar } from './QuickAccessToolbar';
import { ShortcutsHelpOverlay } from './ShortcutsHelpOverlay';

function ImpersonationBanner({ onStop }: { onStop: () => void }) {
  return (
    <div className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between sticky top-0 z-[60]">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 animate-pulse" />
        <span>Viewing as Simulated User</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        className="h-auto py-1 px-3 text-white hover:bg-indigo-700 hover:text-white"
      >
        Exit Simulation
        <X className="ml-2 h-3 w-3" />
      </Button>
    </div>
  );
}

function SettingsDropdown({
  isAdmin,
  onImpersonate,
  onNav,
}: {
  isAdmin: boolean;
  onImpersonate: () => void;
  onNav: (path: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-muted rounded-lg transition-colors duration-200"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem
            className="cursor-pointer touch-target text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50 transition-colors duration-200"
            onClick={onImpersonate}
          >
            <Eye className="mr-2 h-4 w-4" />
            <span>View As...</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="cursor-pointer touch-target transition-colors duration-200"
          onClick={() => onNav('/settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>General Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer touch-target transition-colors duration-200"
          onClick={() => onNav('/notifications')}
        >
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer touch-target transition-colors duration-200"
          onClick={() => onNav('/settings')}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserDropdown({
  userName,
  userImageUrl,
  userEmail,
  onNav,
  onSignOut,
}: {
  userName: string;
  userImageUrl: string;
  userEmail?: string;
  onNav: (path: string) => void;
  onSignOut: () => void;
}) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-lg hover:bg-muted transition-colors duration-200"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={userImageUrl} alt={userName} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer touch-target hover:bg-accent transition-colors duration-200"
          onClick={() => onNav('/settings')}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer touch-target hover:bg-accent transition-colors duration-200"
          onClick={() => onNav('/settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer touch-target transition-colors duration-200"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const { isAdmin, primaryRole } = useUserRBAC();
  const userName = user ? `${user.firstName} ${user.lastName}` : '';
  const userRole = primaryRole
    ? primaryRole.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : '';
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
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm transition-colors duration-200">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open mobile menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 shrink-0 group cursor-pointer hover:opacity-80 transition-opacity">
                <MDMLogo size="md" showText={true} />
              </div>
              <nav className="hidden md:flex items-center flex-1 min-w-0 overflow-x-auto custom-scrollbar pb-1 -mb-1">
                <Navigation />
              </nav>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <DivisionSelector className="hidden md:flex" />
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Online
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hover:bg-muted rounded-lg transition-colors duration-200"
                aria-label="Open navigation menu"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
              <NotificationBell />
              {user ? (
                <div className="hidden lg:flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">{userName}</div>
                    {userRole && <div className="text-xs text-muted-foreground">{userRole}</div>}
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              )}
              <SettingsDropdown
                isAdmin={isAdmin}
                onImpersonate={() => setIsImpersonationOpen(true)}
                onNav={orgPush}
              />
              <UserDropdown
                userName={userName}
                userImageUrl={user?.imageUrl ?? ''}
                userEmail={user?.primaryEmailAddress?.emailAddress}
                onNav={orgPush}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </div>
      </header>
      {showQuickAccessToolbar && <QuickAccessToolbar />}
      <MobileNavigationDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      <ShortcutsHelpOverlay
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />
      {isAdmin && (
        <ImpersonationSelector open={isImpersonationOpen} onOpenChange={setIsImpersonationOpen} />
      )}
    </>
  );
}
