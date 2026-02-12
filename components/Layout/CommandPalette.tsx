'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  FolderKanban,
  FileText,
  Calendar,
  Users,
  Settings,
  Bell,
  Shield,
  Search,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'Projects',
    items: [
      { icon: FolderKanban, label: 'Projects', href: '/projects' },
      { icon: Calendar, label: 'Schedule', href: '/schedule' },
      { icon: Users, label: 'Team', href: '/team' },
    ],
  },
  {
    title: 'Resources',
    items: [{ icon: FileText, label: 'Documents', href: '/documents' }],
  },
  {
    title: 'System',
    items: [
      { icon: Settings, label: 'Settings', href: '/settings' },
      { icon: Bell, label: 'Notifications', href: '/notifications' },
      { icon: Shield, label: 'Admin', href: '/admin', adminOnly: true },
    ],
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPages, setRecentPages] = useState<string[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Projects: true,
    Resources: true,
    System: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem('recentPages');
    if (stored) {
      setRecentPages(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (pathname !== '/dashboard' && pathname !== '/') {
      const newRecent = [pathname, ...recentPages.filter((p) => p !== pathname)].slice(0, 5);
      setRecentPages(newRecent);
      localStorage.setItem('recentPages', JSON.stringify(newRecent));
    }
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose();
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredSections = navigationSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.adminOnly || currentUser?.role === 'admin') &&
        item.label.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  }));

  const getRecentPageLabel = (path: string) => {
    for (const section of navigationSections) {
      const item = section.items.find((i) => i.href === path);
      if (item) return item;
    }
    return null;
  };

  const recentItems = recentPages
    .map((path) => getRecentPageLabel(path))
    .filter(Boolean) as NavItem[];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-lg font-semibold">Navigation</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd+K</kbd>
            <span>to close</span>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {!searchQuery && recentItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
                  <Clock className="h-4 w-4" />
                  Recent
                </div>
                <div className="space-y-1">
                  {recentItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        'hover:bg-accent text-left',
                        pathname === item.href && 'bg-muted',
                      )}
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredSections.map((section) =>
              section.items.length > 0 ? (
                <Collapsible
                  key={section.title}
                  open={openSections[section.title]}
                  onOpenChange={() => toggleSection(section.title)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <span>{section.title}</span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform',
                        openSections[section.title] && 'rotate-90',
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-2">
                    {section.items.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => handleNavigation(item.href)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                          'hover:bg-accent text-left',
                          pathname === item.href && 'bg-muted',
                        )}
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : null,
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
