'use client';

import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ENTITY_TYPE_ORDER,
  EntityType,
  entityTypeConfig,
  FlatSearchResult,
  GlobalSearchResults,
  navigationSections,
  NavItem,
} from '@/components/Layout/CommandPaletteTypes';
import { useCommandKeyboard } from '@/hooks/useCommandKeyboard';
import { useCommandSearch } from '@/hooks/useCommandSearch';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useUserRBAC } from '@/hooks/useRBAC';
import { useRecentPages } from '@/hooks/useRecentPages';

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

// eslint-disable-next-line max-lines-per-function
export function useCommandPalette(isOpen: boolean, onClose: () => void): UseCommandPaletteReturn {
  const { push: orgPush } = useOrgRouter();
  const pathname = usePathname();
  const { isAdmin } = useUserRBAC();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    CRM: true,
    Projects: true,
    Actions: true,
    Resources: true,
    System: true,
  });

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef(selectedIndex);
  const flatResultsRef = useRef<FlatSearchResult[]>([]);
  const filteredNavItemsRef = useRef<NavItem[]>([]);
  const handleNavigationRef = useRef<(path: string) => void>(() => {});
  const handleEntityNavigationRef = useRef<(entityType: EntityType, id: string) => void>(() => {});
  const onCloseRef = useRef<() => void>(() => {});

  const { searchResults, isSearching, nlAnswer, isNlQuery } = useCommandSearch(searchQuery);
  const { recentItems } = useRecentPages(pathname);

  // Reset on close — adjust state based on prop change (no effect needed)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }

  // Sync stable refs
  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

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

  useEffect(() => {
    handleNavigationRef.current = handleNavigation;
  }, [handleNavigation]);

  useEffect(() => {
    handleEntityNavigationRef.current = handleEntityNavigation;
  }, [handleEntityNavigation]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const toggleSection = useCallback((title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const filteredSections = useMemo(
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

  const filteredNavItems = useMemo(
    () => filteredSections.flatMap((section) => section.items),
    [filteredSections],
  );

  const flatResults = useMemo<FlatSearchResult[]>(() => {
    if (!searchResults) return [];
    const results: FlatSearchResult[] = [];
    for (const entityType of ENTITY_TYPE_ORDER) {
      for (const result of searchResults[entityType]) {
        results.push({ entityType, result });
      }
    }
    return results;
  }, [searchResults]);

  const hasSearchResults = flatResults.length > 0;

  const groupedEntityTypes = useMemo(
    () => (searchResults ? ENTITY_TYPE_ORDER.filter((type) => searchResults[type].length > 0) : []),
    [searchResults],
  );

  useEffect(() => {
    flatResultsRef.current = flatResults;
  }, [flatResults]);

  useEffect(() => {
    filteredNavItemsRef.current = filteredNavItems;
  }, [filteredNavItems]);

  useCommandKeyboard(isOpen, setSelectedIndex, {
    scrollAreaRef,
    flatResultsRef,
    filteredNavItemsRef,
    selectedIndexRef,
    handleNavigationRef,
    handleEntityNavigationRef,
    onCloseRef,
  });

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
