'use client';

import React, { useEffect } from 'react';

import { EntityType, FlatSearchResult, NavItem } from '@/components/Layout/CommandPaletteTypes';

export interface CommandKeyboardRefs {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  flatResultsRef: React.RefObject<FlatSearchResult[]>;
  filteredNavItemsRef: React.RefObject<NavItem[]>;
  selectedIndexRef: React.RefObject<number>;
  handleNavigationRef: React.RefObject<(path: string) => void>;
  handleEntityNavigationRef: React.RefObject<(entityType: EntityType, id: string) => void>;
  onCloseRef: React.RefObject<() => void>;
}

export function useCommandKeyboard(
  isOpen: boolean,
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
  refs: CommandKeyboardRefs,
): void {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        refs.onCloseRef.current();
        return;
      }
      if (e.key === 'Escape') {
        refs.onCloseRef.current();
        return;
      }

      const flat = refs.flatResultsRef.current;
      const navItems = refs.filteredNavItemsRef.current;
      const totalItems = flat.length + navItems.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, totalItems - 1);
          queueMicrotask(() => {
            const el = refs.scrollAreaRef.current?.querySelector(`[data-index="${next}"]`);
            el?.scrollIntoView({ block: 'nearest' });
          });
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          queueMicrotask(() => {
            const el = refs.scrollAreaRef.current?.querySelector(`[data-index="${next}"]`);
            el?.scrollIntoView({ block: 'nearest' });
          });
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const currentIndex = refs.selectedIndexRef.current;
        if (currentIndex < flat.length) {
          const item = flat[currentIndex];
          refs.handleEntityNavigationRef.current(item.entityType, item.result.id);
        } else {
          const navIndex = currentIndex - flat.length;
          if (navItems[navIndex]) {
            refs.handleNavigationRef.current(navItems[navIndex].href);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setSelectedIndex, refs]);
}
