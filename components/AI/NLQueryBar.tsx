'use client';

import { Loader2, Search, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { type NLQueryResult, useNLQuery } from '@/hooks/use-ai';

export function NLQueryBar() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<NLQueryResult | null>(null);
  const { mutate, isPending, isError } = useNLQuery();

  function handleSubmit() {
    const trimmed = question.trim();
    if (!trimmed || isPending) return;
    mutate(trimmed, {
      onSuccess: (data) => setResult(data),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit();
  }

  function dismiss() {
    setResult(null);
    setQuestion('');
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data..."
            className="pl-9 rounded-2xl bg-background border-border/60"
            disabled={isPending}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!question.trim() || isPending}
          size="icon"
          className="rounded-2xl shrink-0"
          aria-label="Run query"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isError && (
        <p className="text-sm text-red-600 px-1" role="alert">
          Query failed. Please try again.
        </p>
      )}

      {result && (
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm leading-relaxed">{result.answer}</p>
                {result.toolCalls && result.toolCalls.length > 0 && (
                  <div className="pt-1 space-y-1">
                    {result.toolCalls.map((tc, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium">{tc.name}</span>
                        {' — '}
                        {typeof tc.result === 'string'
                          ? tc.result
                          : JSON.stringify(tc.result).slice(0, 120)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={dismiss}
                className="shrink-0 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Dismiss result"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
