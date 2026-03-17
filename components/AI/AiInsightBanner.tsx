'use client';

import { Lightbulb, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  content: string;
  confidence: number;
  action_url: string | null;
  action_label: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AiInsightBannerProps {
  entityType: string;
  entityId: string;
}

export function AiInsightBanner({ entityType, entityId }: AiInsightBannerProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [minConfidence, setMinConfidence] = useState(0.7);

  useEffect(() => {
    fetch('/api/ai/preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { preferences?: { insight_min_confidence?: number } } | null) => {
        if (data?.preferences?.insight_min_confidence !== undefined) {
          setMinConfidence(data.preferences.insight_min_confidence);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!entityType || !entityId) return;

    fetch(
      `/api/ai/insights?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { insights?: Insight[] } | null) => {
        if (data?.insights) {
          setInsights(data.insights);
        }
      })
      .catch(() => {
        // Insights are supplementary — fail silently
      });
  }, [entityType, entityId]);

  const handleDismiss = async (insightId: string) => {
    // Optimistically remove from UI
    setInsights((prev) => prev.filter((i) => i.id !== insightId));

    try {
      await fetch(`/api/ai/insights/${insightId}/dismiss`, { method: 'PATCH' });
    } catch {
      // Fire-and-forget — already removed from UI
    }
  };

  const visibleInsights = insights.filter((i) => i.confidence >= minConfidence);
  if (visibleInsights.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {visibleInsights.map((insight) => (
        <div
          key={insight.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4',
            'dark:border-amber-400 dark:bg-amber-950/20',
          )}
        >
          <div className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">
            <Lightbulb className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">{insight.title}</p>
            <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">{insight.content}</p>

            {insight.action_url && insight.action_label && (
              <Link
                href={insight.action_url}
                className="mt-2 inline-block text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
              >
                {insight.action_label}
              </Link>
            )}
          </div>

          <button
            type="button"
            aria-label="Dismiss insight"
            onClick={() => handleDismiss(insight.id)}
            className="mt-0.5 shrink-0 rounded p-0.5 text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-900 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
