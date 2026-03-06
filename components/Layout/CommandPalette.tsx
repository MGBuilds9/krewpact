'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
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
  Building2,
  User,
  TrendingUp,
  ListTodo,
  Plus,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch } from '@/lib/api-client';
import type { PaginatedResponse } from '@/hooks/useCRM';

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

interface CRMResult {
  id: string;
  type: 'lead' | 'account' | 'contact' | 'opportunity';
  name: string;
  subtitle?: string;
}

const navigationSections: NavSection[] = [
  {
    title: 'CRM',
    items: [
      { icon: Building2, label: 'Dashboard', href: '/crm/dashboard' },
      { icon: ListTodo, label: 'My Tasks', href: '/crm/tasks' },
      { icon: Building2, label: 'Leads', href: '/crm/leads' },
      { icon: Building2, label: 'Accounts', href: '/crm/accounts' },
      { icon: User, label: 'Contacts', href: '/crm/contacts' },
      { icon: TrendingUp, label: 'Pipeline', href: '/crm/opportunities' },
      { icon: Building2, label: 'Sequences', href: '/crm/sequences' },
    ],
  },
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
    title: 'Actions',
    items: [
      { icon: Plus, label: 'New Lead', href: '/crm/leads/new' },
      { icon: Plus, label: 'New Account', href: '/crm/accounts/new' },
      { icon: Plus, label: 'New Contact', href: '/crm/contacts/new' },
      { icon: Plus, label: 'New Opportunity', href: '/crm/opportunities/new' },
    ],
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

const typeIcons: Record<string, React.ElementType> = {
  lead: Building2,
  account: Building2,
  contact: User,
  opportunity: TrendingUp,
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { push: orgPush } = useOrgRouter();
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [crmResults, setCrmResults] = useState<CRMResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('recentPages');
    return stored ? JSON.parse(stored) : [];
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    CRM: true,
    Projects: true,
    Actions: true,
    Resources: true,
    System: true,
  });

  const lastPathRef = React.useRef(pathname);

  useEffect(() => {
    if (pathname !== '/dashboard' && pathname !== '/' && pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      const stored = localStorage.getItem('recentPages');
      const current = stored ? JSON.parse(stored) : [];
      const updatedRecent = [pathname, ...current.filter((p: string) => p !== pathname)].slice(
        0,
        5,
      );
      localStorage.setItem('recentPages', JSON.stringify(updatedRecent));
      queueMicrotask(() => {
        setRecentPages(updatedRecent);
      });
    }
  }, [pathname]);

  // Search CRM entities with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setCrmResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiFetch<PaginatedResponse<{
          id: string;
          entity_type: string;
          display_name: string;
          subtitle?: string;
        }>>('/api/crm/search', {
          params: { q: searchQuery, limit: 8 },
        });
        setCrmResults(
          (res.data ?? []).map((r) => ({
            id: r.id,
            type: r.entity_type as CRMResult['type'],
            name: r.display_name,
            subtitle: r.subtitle,
          })),
        );
      } catch {
        setCrmResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setCrmResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleNavigation = useCallback(
    (path: string) => {
      orgPush(path);
      onClose();
    },
    [orgPush, onClose],
  );

  const handleCrmNavigation = useCallback(
    (result: CRMResult) => {
      const pathMap: Record<string, string> = {
        lead: '/crm/leads',
        account: '/crm/accounts',
        contact: '/crm/contacts',
        opportunity: '/crm/opportunities',
      };
      orgPush(`${pathMap[result.type]}/${result.id}`);
      onClose();
    },
    [orgPush, onClose],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Navigate results with arrow keys
      const totalItems = crmResults.length + filteredNavItems.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < crmResults.length) {
          handleCrmNavigation(crmResults[selectedIndex]);
        } else {
          const navIndex = selectedIndex - crmResults.length;
          if (filteredNavItems[navIndex]) {
            handleNavigation(filteredNavItems[navIndex].href);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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

  const filteredNavItems = filteredSections.flatMap((s) => s.items);

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
          <DialogTitle className="text-lg font-semibold">Command Palette</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads, accounts, contacts, pages..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="pl-10"
              autoFocus
              aria-label="Search command palette"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Cmd+K</kbd> toggle
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">&uarr;&darr;</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> select
            </span>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {/* CRM Search Results */}
            {crmResults.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
                  <Search className="h-4 w-4" />
                  CRM Results
                </div>
                {crmResults.map((result, index) => {
                  const Icon = typeIcons[result.type] || Building2;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleCrmNavigation(result)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                        index === selectedIndex ? 'bg-accent' : 'hover:bg-accent',
                      )}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{result.name}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {result.subtitle}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {result.type}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Recent Pages */}
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

            {/* Navigation Sections */}
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
                    {section.items.map((item, idx) => {
                      const globalIndex =
                        crmResults.length +
                        filteredSections
                          .slice(
                            0,
                            filteredSections.findIndex((s) => s.title === section.title),
                          )
                          .reduce((sum, s) => sum + s.items.length, 0) +
                        idx;

                      return (
                        <button
                          key={item.href}
                          onClick={() => handleNavigation(item.href)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                            'text-left',
                            globalIndex === selectedIndex ? 'bg-accent' : 'hover:bg-accent',
                            pathname === item.href && 'bg-muted',
                          )}
                        >
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
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
