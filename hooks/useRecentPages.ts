'use client';

import { useEffect, useRef, useState } from 'react';

import { navigationSections, NavItem } from '@/components/Layout/CommandPaletteTypes';

const RECENT_PAGES_KEY = 'recentPages';
const MAX_RECENT_PAGES = 5;
const EXCLUDED_PATHS = ['/', '/dashboard'];

function getRecentPageLabel(path: string): NavItem | null {
  for (const section of navigationSections) {
    const item = section.items.find((i) => i.href === path);
    if (item) return item;
  }
  return null;
}

export interface UseRecentPagesReturn {
  recentItems: NavItem[];
}

export function useRecentPages(pathname: string): UseRecentPagesReturn {
  const [recentPages, setRecentPages] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const lastPathRef = useRef(pathname);

  useEffect(() => {
    if (!EXCLUDED_PATHS.includes(pathname) && pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      const stored = localStorage.getItem(RECENT_PAGES_KEY);
      const current = stored ? JSON.parse(stored) : [];
      const updated = [pathname, ...current.filter((p: string) => p !== pathname)].slice(
        0,
        MAX_RECENT_PAGES,
      );
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
      queueMicrotask(() => {
        setRecentPages(updated);
      });
    }
  }, [pathname]);

  const recentItems = recentPages.map(getRecentPageLabel).filter(Boolean) as NavItem[];

  return { recentItems };
}
