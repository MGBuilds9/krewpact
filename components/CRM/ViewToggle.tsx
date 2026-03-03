'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'card';

const STORAGE_KEY = 'crm-view-preference';

function getStoredMode(): ViewMode {
  if (typeof window === 'undefined') return 'table';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'table' || saved === 'card') return saved;
  } catch {}
  return 'table';
}

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(getStoredMode);

  const setViewMode = useCallback((newMode: ViewMode) => {
    setMode(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {}
  }, []);

  return [mode, setViewMode];
}

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-md">
      <Button
        variant="ghost"
        size="sm"
        className={cn('rounded-r-none px-2', mode === 'table' && 'bg-muted')}
        onClick={() => onChange('table')}
        aria-label="Table view"
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('rounded-l-none px-2', mode === 'card' && 'bg-muted')}
        onClick={() => onChange('card')}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
