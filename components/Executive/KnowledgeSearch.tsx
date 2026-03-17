'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface SearchResult {
  id: string;
  doc_id: string;
  title: string | null;
  category: string | null;
  division_id: string | null;
  content: string;
  chunk_index: number;
  similarity: number;
}

interface KnowledgeSearchProps {
  onSelect: (result: SearchResult) => void;
}

function ResultCard({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: (r: SearchResult) => void;
}) {
  const preview = result.content.length > 200 ? `${result.content.slice(0, 200)}…` : result.content;
  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => onSelect(result)}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-snug">
            {result.title ?? 'Untitled Document'}
          </CardTitle>
          <span className="text-xs text-muted-foreground shrink-0">
            {Math.round(result.similarity * 100)}%
          </span>
        </div>
        {result.category && (
          <Badge variant="secondary" className="w-fit text-xs">
            {result.category}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className="text-xs text-muted-foreground line-clamp-3">{preview}</p>
      </CardContent>
    </Card>
  );
}

export function KnowledgeSearch({ onSelect }: KnowledgeSearchProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setRawQuery(value);
      if (debounceTimer) clearTimeout(debounceTimer);
      const timer = setTimeout(() => setDebouncedQuery(value), 300);
      setDebounceTimer(timer);
    },
    [debounceTimer],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.executive.knowledge.search(debouncedQuery),
    queryFn: () =>
      apiFetch<{ results: SearchResult[] }>('/api/executive/knowledge/search', {
        method: 'POST',
        body: { query: debouncedQuery, threshold: 0.5, limit: 20 },
      }),
    enabled: debouncedQuery.length >= 3,
  });

  const results = data?.results ?? [];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <Input
          placeholder="Search knowledge base…"
          value={rawQuery}
          onChange={handleChange}
          className="w-full"
        />
        {debouncedQuery.length > 0 && debouncedQuery.length < 3 && (
          <p className="text-xs text-muted-foreground mt-1">Type at least 3 characters to search</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading && debouncedQuery.length >= 3 && (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/3 mb-2" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))}
          </>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Failed to load search results. Please try again.
          </p>
        )}
        {!isLoading && results.length === 0 && debouncedQuery.length >= 3 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No results found for &quot;{debouncedQuery}&quot;
          </p>
        )}
        {results.map((result) => (
          <ResultCard key={result.id} result={result} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
