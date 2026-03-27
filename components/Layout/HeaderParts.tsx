'use client';

import { Bell, Eye, LogOut, Moon, Settings, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

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

// ============================================================
// ThemeToggle
// ============================================================

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="hover:bg-muted rounded-lg transition-colors duration-200"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

// ============================================================
// ImpersonationBanner
// ============================================================

export function ImpersonationBanner({ onStop }: { onStop: () => void }) {
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

// ============================================================
// SettingsDropdown
// ============================================================

export function SettingsDropdown({
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================
// UserDropdown
// ============================================================

export function UserDropdown({
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
