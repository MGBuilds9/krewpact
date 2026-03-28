'use client';

import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  ENTITY_TYPE_ORDER,
  EntityType,
  entityTypeConfig,
  FlatSearchResult,
  GlobalSearchResults,
  navigationSections,
  NavItem,
} from '@/components/Layout/CommandPaletteTypes';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useUserRBAC } from '@/hooks/useRBAC';
import { apiFetch } from '@/lib/api-client';

export interface UseCommandPaletteReturn {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: GlobalSearchResults | null;
  isSearching: boolean;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  nlAnswer: string | null;
  isNlQuery: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  recentItems: NavItem[];
  openSections: Record<string, boolean>;
  toggleSection: (title: string) => void;
  filteredSections: Array<{ title: string; items: NavItem[] }>;
  filteredNavItems: NavItem[];
  flatResults: FlatSearchResult[];
  hasSearchResults: boolean;
  groupedEntityTypes: EntityType[];
  handleNavigation: (path: string) => void;
  handleEntityNavigation: (entityType: EntityType, id: string) => void;
  pathname: string;
}

function isNaturalLanguageQuery(q: string): boolean {
  const nlPatterns =
    /^(show me|what|how many|find|list all|get me|who|where|which|count|total|average)/i;
  return q.includes('?') || nlPatterns.test(q.trim());
}

// eslint-disable-next-line max-lines-per-function
export function useCommandPalette(isOpen: boolean, onClose: () => void): UseCommandPaletteReturn {
  const { push: orgPush } = useOrgRouter();
  const pathname = usePathname();
  const { isAdmin } = useUserRBAC();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [nlAnswer, setNlAnswer] = useState<string | null>(null);
  const [isNlQuery, setIsNlQuery] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const searchRequestRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const searchRequestSeqRef = useRef(0);
  const selectedIndexRef = useRef(selectedIndex);
  const flatResultsRef = useRef<FlatSearchResult[]>([]);
  const filteredNavItemsRef = useRef<NavItem[]>([]);
  const handleNavigationRef = useRef<(path: string) => void>(() => {});
  const handleEntityNavigationRef = useRef<(entityType: EntityType, id: string) => void>(() => {});
  const onCloseRef = useRef<() => void>(() => {});

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

  React.useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  // Search with debounce
  useEffect(() => {
    if (searchRequestRef.current) {
      searchRequestRef.current.controller.abort();
      searchRequestRef.current = null;
    }

    if (searchQuery.length < 2) {
      setSearchResults(null);
      setIsNlQuery(false);
      setNlAnswer(null);
      setIsSearching(false);
      return;
    }

    if (isNaturalLanguageQuery(searchQuery) && searchQuery.length >= 5) {
      const controller = new AbortController();
      const requestId = ++searchRequestSeqRef.current;
      const nlTimeout = setTimeout(async () => {
        searchRequestRef.current = { id: requestId, controller };
        setIsNlQuery(true);
        setIsSearching(true);
        try {
          const res = await apiFetch<{ answer: string; data?: unknown }>('/api/ai/query', {
            method: 'POST',
            body: { query: searchQuery },
            signal: controller.signal,
          });
          if (controller.signal.aborted || searchRequestRef.current?.id !== requestId) {
            return;
          }
          setNlAnswer(res.answer);
        } catch {
          if (controller.signal.aborted) {
            return;
          }
          setNlAnswer(null);
        } finally {
          if (searchRequestRef.current?.id === requestId) {
            setIsSearching(false);
            searchRequestRef.current = null;
          }
        }
      }, 600);
      return () => {
        clearTimeout(nlTimeout);
        controller.abort();
      };
    }

    setIsNlQuery(false);
    setNlAnswer(null);

    const controller = new AbortController();
    const requestId = ++searchRequestSeqRef.current;
    const timeout = setTimeout(async () => {
      searchRequestRef.current = { id: requestId, controller };
      setIsSearching(true);
      try {
        const res = await apiFetch<{ results: GlobalSearchResults }>('/api/search/global', {
          params: { q: searchQuery },
          signal: controller.signal,
        });
        if (controller.signal.aborted || searchRequestRef.current?.id !== requestId) {
          return;
        }
        setSearchResults(res.results);
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setSearchResults(null);
      } finally {
        if (searchRequestRef.current?.id === requestId) {
          setIsSearching(false);
          searchRequestRef.current = null;
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  // Reset on close
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

  React.useEffect(() => {
    handleNavigationRef.current = handleNavigation;
  }, [handleNavigation]);

  React.useEffect(() => {
    handleEntityNavigationRef.current = handleEntityNavigation;
  }, [handleEntityNavigation]);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const toggleSection = useCallback((title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const filteredSections = React.useMemo(
    () =>
      navigationSections.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            (!item.adminOnly || isAdmin) &&
            item.label.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      })),
    [isAdmin, searchQuery],
  );

  const filteredNavItems = React.useMemo(
    () => filteredSections.flatMap((section) => section.items),
    [filteredSections],
  );

  // Flat results for keyboard nav
  const flatResults = React.useMemo<FlatSearchResult[]>(() => {
    if (!searchResults) {
      return [];
    }

    const results: FlatSearchResult[] = [];
    for (const entityType of ENTITY_TYPE_ORDER) {
      for (const result of searchResults[entityType]) {
        results.push({ entityType, result });
      }
    }
    return results;
  }, [searchResults]);

  const hasSearchResults = flatResults.length > 0;

  const groupedEntityTypes = React.useMemo(
    () => (searchResults ? ENTITY_TYPE_ORDER.filter((type) => searchResults[type].length > 0) : []),
    [searchResults],
  );

  React.useEffect(() => {
    flatResultsRef.current = flatResults;
  }, [flatResults]);

  React.useEffect(() => {
    filteredNavItemsRef.current = filteredNavItems;
  }, [filteredNavItems]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      const flat = flatResultsRef.current;
      const navItems = filteredNavItemsRef.current;
      const totalItems = flat.length + navItems.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, totalItems - 1);
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
        const currentIndex = selectedIndexRef.current;
        if (currentIndex < flat.length) {
          const item = flat[currentIndex];
          handleEntityNavigationRef.current(item.entityType, item.result.id);
        } else {
          const navIndex = currentIndex - flat.length;
          if (navItems[navIndex]) {
            handleNavigationRef.current(navItems[navIndex].href);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectedIndex,
    setSelectedIndex,
    nlAnswer,
    isNlQuery,
    scrollAreaRef,
    recentItems,
    openSections,
    toggleSection,
    filteredSections,
    filteredNavItems,
    flatResults,
    hasSearchResults,
    groupedEntityTypes,
    handleNavigation,
    handleEntityNavigation,
    pathname,
  };
}
