'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  FolderOpen,
  FileText,
  Calendar,
  Users,
  Shield,
  X,
  User,
  Settings,
  LogOut,
  Bell,
  DollarSign,
  ClipboardList,
  Building2,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUser, useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';
import { DivisionSelector } from './DivisionSelector';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: Building2, label: 'CRM', href: '/crm' },
  { icon: Calculator, label: 'Estimates', href: '/estimates' },
  { icon: FolderOpen, label: 'Projects', href: '/projects' },
  { icon: FileText, label: 'Documents', href: '/documents' },
  { icon: Calendar, label: 'Schedule', href: '/schedule' },
  { icon: Users, label: 'Team', href: '/team' },
  { icon: DollarSign, label: 'Expenses', href: '/expenses' },
  { icon: ClipboardList, label: 'Reports', href: '/reports' },
  { icon: Shield, label: 'Admin', href: '/admin', adminOnly: true },
];

export function MobileNavigationDrawer({ isOpen, onClose }: MobileNavigationDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { user } = useUser();
  const { signOut } = useClerk();

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  const userRole = currentUser?.role || 'User';

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose();
  };

  const filteredItems = navigationItems.filter(
    (item) => !item.adminOnly || currentUser?.role === 'admin',
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
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
          {/* User Profile Section */}
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

            {/* Online Status */}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">Online</span>
            </div>
          </div>

          {/* Division Selector */}
          <div className="mb-6">
            <DivisionSelector className="w-full" />
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2 mb-6">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
              <Button
                key={item.label}
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start touch-target h-12 transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => handleNavigation(item.href)}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
              );
            })}
          </nav>

          {/* Quick Actions */}
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

        {/* Footer Actions */}
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
