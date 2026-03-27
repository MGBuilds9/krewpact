'use client';

import dynamic from 'next/dynamic';

import { LeadScoreCard } from '@/components/CRM/LeadScoreCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RuleResultDisplay, useLead } from '@/hooks/useCRM';

import { LeadQuickInfo } from './LeadQuickInfo';

const EnrichmentIntelCard = dynamic(
  () => import('@/components/CRM/EnrichmentIntelCard').then((m) => m.EnrichmentIntelCard),
  { loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);

type LeadData = NonNullable<ReturnType<typeof useLead>['data']>;

interface LeadSidePanelProps {
  lead: LeadData;
  leadTags: string[];
  contactCount: number;
  activityCount: number;
  ruleResults: RuleResultDisplay[] | undefined;
  onRecalculate: () => void;
  isRecalculating: boolean;
  onResearchComplete: () => void;
}

export function LeadSidePanel({
  lead,
  leadTags,
  contactCount,
  activityCount,
  ruleResults,
  onRecalculate,
  isRecalculating,
  onResearchComplete,
}: LeadSidePanelProps) {
  const score = lead.lead_score || 0;
  const fitScore = lead.fit_score || 0;
  const intentScore = lead.intent_score || 0;
  const engagementScore = lead.engagement_score || 0;
  return (
    <div className="space-y-6">
      <LeadScoreCard
        score={score}
        fitScore={fitScore}
        intentScore={intentScore}
        engagementScore={engagementScore}
        onRecalculate={onRecalculate}
        isRecalculating={isRecalculating}
        ruleResults={ruleResults}
      />
      <LeadQuickInfo lead={lead} contactCount={contactCount} activityCount={activityCount} />
      {leadTags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {leadTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <EnrichmentIntelCard
        enrichmentData={lead.enrichment_data as Record<string, unknown> | null}
        enrichmentStatus={lead.enrichment_status as string | null}
        leadId={lead.id}
        onResearchComplete={onResearchComplete}
      />
    </div>
  );
}
