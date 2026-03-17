'use client';

import { Loader2, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

interface CommandPaletteSearchProps {
  searchQuery: string;
  isSearching: boolean;
  onSearchChange: (value: string) => void;
  onIndexReset: () => void;
}

export function CommandPaletteSearch({
  searchQuery,
  isSearching,
  onSearchChange,
  onIndexReset,
}: CommandPaletteSearchProps) {
  return (
    <div className="px-4 py-3 border-b">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search or ask a question..."
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            onIndexReset();
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
  );
}
