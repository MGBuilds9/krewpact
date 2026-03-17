'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import {
  Bell,
  Building2,
  Calculator,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  Home,
  LogOut,
  Settings,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import React from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { DivisionSelector } from './DivisionSelector';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Building2, label: 'CRM', path: '/crm' },
  { icon: Calculator, label: 'Estimates', path: '/estimates' },
  { icon: FolderOpen, label: 'Projects', path: '/projects' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: Calendar, label: 'Schedule', path: '/schedule' },
  { icon: Users, label: 'Team', path: '/team' },
  { icon: DollarSign, label: 'Expenses', path: '/expenses' },
  { icon: ClipboardList, label: 'Reports', path: '/reports' },
  { icon: Shield, label: 'Admin', path: '/admin', adminOnly: true },
];

function NavButton({
  icon: Icon,
  label,
  path,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      key={path}
      variant={isActive ? 'default' : 'ghost'}
      className={`w-full justify-start touch-target h-12 transition-colors duration-200 ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`}
      onClick={onClick}
    >
      <Icon className="h-5 w-5 mr-3" />
      {label}
    </Button>
  );
}

export function MobileNavigationDrawer({ isOpen, onClose }: MobileNavigationDrawerProps) {
  const pathname = usePathname();
  const { push: orgPush } = useOrgRouter();
  const { data: currentUser } = useCurrentUser();
  const { user } = useUser();
  const { signOut } = useClerk();

  const userName = user ? `${user.firstName} ${user.lastName}` : '';
  const userRole = currentUser?.role || 'User';

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const handleNavigation = (path: string) => {
    orgPush(path);
    onClose();
  };
  const filteredItems = navigationItems.filter(
    (item) => !item.adminOnly || currentUser?.role === 'admin',
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 max-w-[85vw] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              KrewPact
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="touch-target transition-colors duration-200 rounded-full hover:bg-muted"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 mb-6 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.imageUrl || ''} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold text-lg">
                  {userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground truncate">{userName}</div>
                <div className="text-sm text-muted-foreground capitalize">{userRole}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Online</span>
            </div>
          </div>
          <div className="mb-6">
            <DivisionSelector className="w-full" />
          </div>
          <nav className="space-y-2 mb-6">
            {filteredItems.map((item) => (
              <NavButton
                key={item.label}
                icon={item.icon}
                label={item.label}
                path={item.path}
                isActive={pathname.includes(item.path)}
                onClick={() => handleNavigation(item.path)}
              />
            ))}
          </nav>
          <div className="space-y-2 mb-6">
            <div className="text-sm font-medium text-muted-foreground mb-2">Quick Actions</div>
            <Button
              variant="outline"
              className="w-full justify-start touch-target h-12 transition-colors duration-200 hover:bg-accent"
              onClick={() => handleNavigation('/notifications')}
            >
              <Bell className="h-5 w-5 mr-3" />
              Notifications
              <Badge variant="destructive" className="ml-auto">
                0
              </Badge>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start touch-target h-12 transition-colors duration-200 hover:bg-accent"
              onClick={() => handleNavigation('/settings')}
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Button>
          </div>
        </div>
        <div className="p-6 pt-4 border-t">
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start touch-target h-12 transition-colors duration-200 hover:bg-accent"
              onClick={() => handleNavigation('/settings')}
            >
              <User className="h-5 w-5 mr-3" />
              Profile
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start touch-target h-12 transition-colors duration-200 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
