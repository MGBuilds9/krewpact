'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { LogOut, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

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
import { formatStatus } from '@/lib/format-status';

interface UserMenuProps {
  user: ReturnType<typeof useUser>['user'];
  userName: string;
  userRole: string;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

function UserMenu({
  user,
  userName,
  userRole,
  onSignOut,
  onNavigate,
}: UserMenuProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4">
      <div className="hidden lg:flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">{userName}</div>
          <div className="text-xs text-muted-foreground">{userRole}</div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-lg hover:bg-muted transition-colors duration-200"
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
            onClick={() => onNavigate('/portals/profile')}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer touch-target hover:bg-accent transition-colors duration-200"
            onClick={() => onNavigate('/portals/settings')}
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
    </div>
  );
}

export function PortalHeader() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const userName = user ? `${user.firstName} ${user.lastName}` : '';
  const roles = user?.publicMetadata?.krewpact_roles as string[] | undefined;
  const userRole =
    roles && roles.length > 0
      ? formatStatus(roles[0])
      : 'Portal User';

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm transition-colors duration-200">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
              <MDMLogo size="md" showText={true} />
              <span className="text-sm font-semibold text-muted-foreground ml-2 hidden sm:inline-block border-l pl-3">
                Client Portal
              </span>
            </div>
          </div>
          <UserMenu
            user={user}
            userName={userName}
            userRole={userRole}
            onSignOut={handleSignOut}
            onNavigate={(path) => router.push(path)}
          />
        </div>
      </div>
    </header>
  );
}
