'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Gavel,
  BarChart3,
  Phone,
  Target,
  Calculator,
  CheckSquare,
  Lightbulb,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch } from '@/lib/api-client';

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

interface EntityResult {
  id: string;
  name: string;
  subtitle: string | null;
}

type EntityType =
  | 'leads'
  | 'accounts'
  | 'contacts'
  | 'opportunities'
  | 'estimates'
  | 'projects'
  | 'tasks';

interface GlobalSearchResults {
  leads: EntityResult[];
  accounts: EntityResult[];
  contacts: EntityResult[];
  opportunities: EntityResult[];
  estimates: EntityResult[];
  projects: EntityResult[];
  tasks: EntityResult[];
}

interface FlatSearchResult {
  entityType: EntityType;
  result: EntityResult;
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
      { icon: Gavel, label: 'Bidding', href: '/crm/bidding' },
      { icon: Building2, label: 'Enrichment', href: '/crm/enrichment' },
      { icon: BarChart3, label: 'CRM Report', href: '/reports/crm-overview' },
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
      { icon: Plus, label: 'New Bid', href: '/crm/bidding/new' },
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

const entityTypeConfig: Record<
  EntityType,
  { icon: React.ElementType; label: string; pathPrefix: string }
> = {
  leads: { icon: User, label: 'Leads', pathPrefix: '/crm/leads' },
  accounts: { icon: Building2, label: 'Accounts', pathPrefix: '/crm/accounts' },
  contacts: { icon: Phone, label: 'Contacts', pathPrefix: '/crm/contacts' },
  opportunities: { icon: Target, label: 'Opportunities', pathPrefix: '/crm/opportunities' },
  estimates: { icon: Calculator, label: 'Estimates', pathPrefix: '/estimates' },
  projects: { icon: FolderKanban, label: 'Projects', pathPrefix: '/projects' },
  tasks: { icon: CheckSquare, label: 'Tasks', pathPrefix: '/tasks' },
};

const ENTITY_TYPE_ORDER: EntityType[] = [
  'leads',
  'accounts',
  'contacts',
  'opportunities',
  'estimates',
  'projects',
  'tasks',
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { push: orgPush } = useOrgRouter();
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [nlAnswer, setNlAnswer] = useState<string | null>(null);
  const [isNlQuery, setIsNlQuery] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
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

  // Flatten search results into ordered list for keyboard navigation
  const flatResults: FlatSearchResult[] = [];
  if (searchResults) {
    for (const entityType of ENTITY_TYPE_ORDER) {
      for (const result of searchResults[entityType]) {
        flatResults.push({ entityType, result });
      }
    }
  }

  const hasSearchResults = flatResults.length > 0;

  function isNaturalLanguageQuery(q: string): boolean {
    const nlPatterns = /^(show me|what|how many|find|list all|get me|who|where|which|count|total|average)/i;
    return q.includes('?') || nlPatterns.test(q.trim());
  }

  // Search all entities with debounce (300ms)
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      setIsNlQuery(false);
      setNlAnswer(null);
      return;
    }

    if (isNaturalLanguageQuery(searchQuery) && searchQuery.length >= 5) {
      // NL query mode — call AI endpoint
      const nlTimeout = setTimeout(async () => {
        setIsNlQuery(true);
        setIsSearching(true);
        try {
          const res = await apiFetch<{ answer: string; data?: unknown }>('/api/ai/query', {
            method: 'POST',
            body: { query: searchQuery },
          });
          setNlAnswer(res.answer);
        } catch {
          setNlAnswer(null);
        } finally {
          setIsSearching(false);
        }
      }, 600); // Longer debounce for NL queries
      return () => clearTimeout(nlTimeout);
    }
    setIsNlQuery(false);
    setNlAnswer(null);

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiFetch<{ results: GlobalSearchResults }>('/api/search/global', {
          params: { q: searchQuery },
        });
        setSearchResults(res.results);
      } catch {
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults(null);
      setSelectedIndex(0);
      setNlAnswer(null);
      setIsNlQuery(false);
    }
  }, [isOpen]);

  const handleNavigation = useCallback(
    (path: string) => {
      orgPush(path);
      onClose();
    },
    [orgPush, onClose],
  );

  const handleEntityNavigation = useCallback(
    (entityType: EntityType, id: string) => {
      const config = entityTypeConfig[entityType];
      orgPush(`${config.pathPrefix}/${id}`);
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
      const totalItems = flatResults.length + filteredNavItems.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, totalItems - 1);
          // Scroll selected item into view
          queueMicrotask(() => {
            const el = scrollAreaRef.current?.querySelector(`[data-index="${next}"]`);
            el?.scrollIntoView({ block: 'nearest' });
          });
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          queueMicrotask(() => {
            const el = scrollAreaRef.current?.querySelector(`[data-index="${next}"]`);
            el?.scrollIntoView({ block: 'nearest' });
          });
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex < flatResults.length) {
          const item = flatResults[selectedIndex];
          handleEntityNavigation(item.entityType, item.result.id);
        } else {
          const navIndex = selectedIndex - flatResults.length;
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

  // Group search results by entity type for display
  const groupedEntityTypes = searchResults
    ? ENTITY_TYPE_ORDER.filter((type) => searchResults[type].length > 0)
    : [];

  // Track running index for keyboard navigation across groups
  let runningIndex = 0;

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
              placeholder="Search or ask a question..."
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
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">?</kbd> ask AI
            </span>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4" ref={scrollAreaRef}>
            {/* Global Search Results — grouped by entity type */}
            {hasSearchResults &&
              groupedEntityTypes.map((entityType) => {
                const config = entityTypeConfig[entityType];
                const Icon = config.icon;
                const results = searchResults![entityType];
                const startIndex = runningIndex;
                runningIndex += results.length;

                return (
                  <div key={entityType} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </div>
                    {results.map((result, idx) => {
                      const globalIdx = startIndex + idx;
                      return (
                        <button
                          key={`${entityType}-${result.id}`}
                          data-index={globalIdx}
                          onClick={() => handleEntityNavigation(entityType, result.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                            globalIdx === selectedIndex ? 'bg-accent' : 'hover:bg-accent',
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
                            {entityType === 'opportunities'
                              ? 'opportunity'
                              : entityType.replace(/s$/, '')}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

            {/* AI Answer */}
            {isNlQuery && nlAnswer && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <Lightbulb className="h-4 w-4" />
                  AI Answer
                </div>
                <p className="text-sm text-blue-900">{nlAnswer}</p>
              </div>
            )}

            {/* NL query in progress */}
            {isNlQuery && isSearching && !nlAnswer && (
              <div className="text-center py-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}

            {/* No results message */}
            {!isNlQuery && searchQuery.length >= 2 && !isSearching && !hasSearchResults && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No results found for &quot;{searchQuery}&quot;
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
                        flatResults.length +
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
                          data-index={globalIndex}
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
