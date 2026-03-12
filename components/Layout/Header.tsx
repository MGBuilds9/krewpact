'use client';

import React from 'react';
import { Settings, User, LogOut, Bell, MoreHorizontal, Eye, X, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Navigation } from './Navigation';
import { DivisionSelector } from './DivisionSelector';
import { MobileNavigationDrawer } from './MobileNavigationDrawer';
import { QuickAccessToolbar } from './QuickAccessToolbar';
import { NotificationBell } from '@/components/Notifications';
import { MDMLogo } from '@/components/ui/MDMLogo';
import { CommandPalette } from './CommandPalette';
import { ShortcutsHelpOverlay } from './ShortcutsHelpOverlay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUser, useClerk } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useUserRBAC } from '@/hooks/useRBAC';
import { ImpersonationSelector } from './ImpersonationSelector';
import { toast } from 'sonner';

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
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  const userRole = primaryRole
    ? primaryRole.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Team Member';
  const showQuickAccessToolbar = !pathname.endsWith('/dashboard') && pathname !== '/';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  // Global keyboard shortcuts (single-key + chord sequences)
  useKeyboardShortcuts(
    [
      {
        key: 'k',
        metaKey: true,
        handler: () => setIsCommandPaletteOpen((prev) => !prev),
      },
      {
        key: '/',
        metaKey: true,
        handler: () => setIsShortcutsHelpOpen((prev) => !prev),
        ignoreInputs: false,
      },
      {
        key: 'n',
        handler: () => orgPush('/crm/leads/new'),
      },
    ],
    [
      // Chord: G then L → Leads
      { firstKey: 'g', secondKey: 'l', handler: () => orgPush('/crm/leads') },
      // Chord: G then P → Projects
      { firstKey: 'g', secondKey: 'p', handler: () => orgPush('/projects') },
      // Chord: G then E → Estimates
      { firstKey: 'g', secondKey: 'e', handler: () => orgPush('/estimates') },
      // Chord: G then D → Dashboard
      { firstKey: 'g', secondKey: 'd', handler: () => orgPush('/dashboard') },
    ],
  );

  return (
    <>
      {isImpersonating && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between sticky top-0 z-[60]">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 animate-pulse" />
            <span>Viewing as Simulated User</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopImpersonation}
            className="h-auto py-1 px-3 text-white hover:bg-indigo-700 hover:text-white"
          >
            Exit Simulation
            <X className="ml-2 h-3 w-3" />
          </Button>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm transition-colors duration-200">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
              {/* Mobile Menu Toggle */}
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

              {/* Desktop Navigation - Hidden on mobile */}
              <nav className="hidden md:flex items-center flex-1 min-w-0 overflow-x-auto custom-scrollbar pb-1 -mb-1">
                <Navigation />
              </nav>
            </div>

            {/* Right Side - User Info and Actions */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              {/* Division Selector */}
              <DivisionSelector className="hidden md:flex" />

              {/* Online Status */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Online
                </span>
              </div>

              {/* More Navigation Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hover:bg-muted rounded-lg transition-colors duration-200"
                aria-label="Open navigation menu"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>

              {/* Notifications */}
              <NotificationBell />

              {/* User Info - Hidden on small screens */}
              <div className="hidden lg:flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">{userName}</div>
                  <div className="text-xs text-muted-foreground">{userRole}</div>
                </div>
              </div>

              {/* Settings */}
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
                      onClick={() => setIsImpersonationOpen(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      <span>View As...</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer touch-target transition-colors duration-200"
                    onClick={() => orgPush('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>General Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer touch-target transition-colors duration-200"
                    onClick={() => orgPush('/notifications')}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer touch-target transition-colors duration-200"
                    onClick={() => orgPush('/settings')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Avatar with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-lg hover:bg-muted transition-colors duration-200"
                    aria-label="User menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.imageUrl || ''} alt={userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {userName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer touch-target hover:bg-accent transition-colors duration-200"
                    onClick={() => orgPush('/settings')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer touch-target hover:bg-accent transition-colors duration-200"
                    onClick={() => orgPush('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer touch-target transition-colors duration-200"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Access Toolbar */}
      {showQuickAccessToolbar && <QuickAccessToolbar />}

      {/* Mobile Navigation Drawer */}
      <MobileNavigationDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Shortcuts Help Overlay */}
      <ShortcutsHelpOverlay
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />

      {/* Impersonation Selector */}
      {isAdmin && (
        <ImpersonationSelector open={isImpersonationOpen} onOpenChange={setIsImpersonationOpen} />
      )}
    </>
  );
}
