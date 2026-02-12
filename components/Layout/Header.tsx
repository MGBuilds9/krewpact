'use client';

import React from 'react';
import {
  Settings,
  User,
  Menu,
  LogOut,
  Bell,
  MoreHorizontal,
  Eye,
  X,
} from 'lucide-react';
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
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useUserRBAC } from '@/hooks/useRBAC';
import { toast } from 'sonner';

export function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  const { isImpersonating, stopImpersonation } = useImpersonation();
  const { isAdmin } = useUserRBAC();

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  const userRole = 'User';
  const showQuickAccessToolbar = pathname !== '/dashboard' && pathname !== '/';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  // Keyboard shortcut for command palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
                <MDMLogo size="md" showText={true} />
              </div>

              {/* Desktop Navigation - Hidden on mobile */}
              <nav className="hidden md:flex items-center gap-2">
                <Navigation />
              </nav>
            </div>

            {/* Right Side - User Info and Actions */}
            <div className="flex items-center gap-4">
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
                className="hover:bg-muted rounded-lg"
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
                    className="hover:bg-muted rounded-lg"
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
                      className="cursor-pointer touch-target text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50"
                      onClick={() => {
                        // TODO: Wire up impersonation selector dialog
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      <span>View As...</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="cursor-pointer touch-target"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>General Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer touch-target"
                    onClick={() => router.push('/notifications')}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer touch-target"
                    onClick={() => router.push('/settings')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Avatar with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-lg hover:bg-muted">
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
                    className="cursor-pointer touch-target hover:bg-accent"
                    onClick={() => router.push('/settings')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer touch-target hover:bg-accent"
                    onClick={() => router.push('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer touch-target" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-muted rounded-lg"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open main menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
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
    </>
  );
}
