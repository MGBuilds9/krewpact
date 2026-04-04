'use client';

import { useEffect, useRef, useState } from 'react';

import { GlobalSearchResults } from '@/components/Layout/CommandPaletteTypes';
import { apiFetch } from '@/lib/api-client';

const NL_PATTERNS =
  /^(show me|what|how many|find|list all|get me|who|where|which|count|total|average)/i;

function isNaturalLanguageQuery(q: string): boolean {
  return q.includes('?') || NL_PATTERNS.test(q.trim());
}

export interface UseCommandSearchReturn {
  searchResults: GlobalSearchResults | null;
  isSearching: boolean;
  nlAnswer: string | null;
  isNlQuery: boolean;
}

export function useCommandSearch(query: string): UseCommandSearchReturn {
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [nlAnswer, setNlAnswer] = useState<string | null>(null);
  const [isNlQuery, setIsNlQuery] = useState(false);

  const requestRef = useRef<{ id: number; controller: AbortController } | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (requestRef.current) {
      requestRef.current.controller.abort();
      requestRef.current = null;
    }

    if (query.length < 2) {
      setSearchResults(null);
      setIsNlQuery(false);
      setNlAnswer(null);
      setIsSearching(false);
      return;
    }

    if (isNaturalLanguageQuery(query) && query.length >= 5) {
      const controller = new AbortController();
      const requestId = ++seqRef.current;
      const nlTimeout = setTimeout(async () => {
        requestRef.current = { id: requestId, controller };
        setIsNlQuery(true);
        setIsSearching(true);
        try {
          const res = await apiFetch<{ answer: string; data?: unknown }>('/api/ai/query', {
            method: 'POST',
            body: { query },
            signal: controller.signal,
          });
          if (controller.signal.aborted || requestRef.current?.id !== requestId) return;
          setNlAnswer(res.answer);
        } catch {
          if (controller.signal.aborted) return;
          setNlAnswer(null);
        } finally {
          if (requestRef.current?.id === requestId) {
            setIsSearching(false);
            requestRef.current = null;
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
    const requestId = ++seqRef.current;
    const timeout = setTimeout(async () => {
      requestRef.current = { id: requestId, controller };
      setIsSearching(true);
      try {
        const res = await apiFetch<{ results: GlobalSearchResults }>('/api/search/global', {
          params: { q: query },
          signal: controller.signal,
        });
        if (controller.signal.aborted || requestRef.current?.id !== requestId) return;
        setSearchResults(res.results);
      } catch {
        if (controller.signal.aborted) return;
        setSearchResults(null);
      } finally {
        if (requestRef.current?.id === requestId) {
          setIsSearching(false);
          requestRef.current = null;
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return { searchResults, isSearching, nlAnswer, isNlQuery };
}
