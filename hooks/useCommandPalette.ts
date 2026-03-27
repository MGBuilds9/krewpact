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

  // Search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      setIsNlQuery(false);
      setNlAnswer(null);
      return;
    }

    if (isNaturalLanguageQuery(searchQuery) && searchQuery.length >= 5) {
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
      }, 600);
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

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredSections = navigationSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.adminOnly || isAdmin) &&
        item.label.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  }));

  const filteredNavItems = filteredSections.flatMap((s) => s.items);

  // Flat results for keyboard nav
  const flatResults: FlatSearchResult[] = [];
  if (searchResults) {
    for (const entityType of ENTITY_TYPE_ORDER) {
      for (const result of searchResults[entityType]) {
        flatResults.push({ entityType, result });
      }
    }
  }

  const hasSearchResults = flatResults.length > 0;

  const groupedEntityTypes = searchResults
    ? ENTITY_TYPE_ORDER.filter((type) => searchResults[type].length > 0)
    : [];

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

      const totalItems = flatResults.length + filteredNavItems.length;
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
