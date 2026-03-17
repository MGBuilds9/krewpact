'use client';

import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  type: 'lead' | 'contact' | 'account' | 'opportunity';
  title: string;
  subtitle: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700',
  contact: 'bg-green-100 text-green-700',
  account: 'bg-purple-100 text-purple-700',
  opportunity: 'bg-amber-100 text-amber-700',
};
const TYPE_PATHS: Record<string, string> = {
  lead: '/crm/leads',
  contact: '/crm/contacts',
  account: '/crm/accounts',
  opportunity: '/crm/opportunities',
};

function SearchResultItem({
  result,
  isSelected,
  onSelect,
  onHover,
}: {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      key={`${result.type}-${result.id}`}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-left transition-colors ${isSelected ? 'bg-muted' : 'hover:bg-muted/50'}`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <Badge variant="secondary" className={`${TYPE_COLORS[result.type] ?? ''} text-xs`}>
        {result.type}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
        )}
      </div>
    </button>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results = [] } = useQuery<SearchResult[]>({
    queryKey: ['crm-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const res = await fetch(`/api/crm/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: query.length >= 2,
  });

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);
  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  const handleSelect = useCallback(
    (result: SearchResult) => {
      handleClose();
      router.push(`/org/${orgSlug}${TYPE_PATHS[result.type] ?? '/crm'}/${result.id}`);
    },
    [handleClose, router, orgSlug],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === 'Escape' && open) handleClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleOpen, handleClose]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedIndex(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) handleSelect(results[selectedIndex]);
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search CRM...</span>
        <kbd className="ml-2 rounded border px-1.5 py-0.5 text-xs font-mono">Cmd+K</kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-label="CRM Search"
    >
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-lg border bg-background shadow-xl">
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search leads, contacts, accounts, opportunities..."
            className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search CRM"
          />
          <button onClick={handleClose} className="p-1" aria-label="Close search">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto p-2">
            {results.map((result, i) => (
              <SearchResultItem
                key={`${result.type}-${result.id}`}
                result={result}
                isSelected={i === selectedIndex}
                onSelect={() => handleSelect(result)}
                onHover={() => setSelectedIndex(i)}
              />
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No results found for &ldquo;{query}&rdquo;
          </div>
        )}
        {query.length < 2 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}
