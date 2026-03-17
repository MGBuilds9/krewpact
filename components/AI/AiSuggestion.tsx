'use client';

import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AiSuggestionProps {
  field: string;
  context: Record<string, unknown>;
  onApply?: (value: string) => void;
}

export function AiSuggestion({ field, context, onApply }: AiSuggestionProps) {
  const [suggestion, setSuggestion] = useState<{ value: string; explanation: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({
        field,
        context: JSON.stringify(context),
      });

      fetch(`/api/ai/suggest?${params}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { suggestion?: string; explanation?: string } | null) => {
          if (data?.suggestion) {
            setSuggestion({ value: data.suggestion, explanation: data.explanation ?? '' });
          }
        })
        .catch(() => {
          // Suggestions are supplementary — fail silently
        });
    }, 500); // Debounce 500ms

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, JSON.stringify(context)]);

  if (!suggestion) return null;

  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>{suggestion.explanation}</span>
      {onApply && (
        <button
          type="button"
          onClick={() => onApply(suggestion.value)}
          className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
          aria-label={`Apply suggestion: ${suggestion.value}`}
        >
          <Check className="h-3 w-3" />
          Apply
        </button>
      )}
    </div>
  );
}
