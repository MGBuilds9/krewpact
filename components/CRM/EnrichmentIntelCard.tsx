'use client';

import { Loader2, Search } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  AiSummarySection,
  DeepResearchSection,
  type EnrichmentData,
  GoogleMapsSection,
  NewsIntelSection,
  PrimaryContactSection,
  WebPresenceSection,
} from './EnrichmentIntelSections';

interface EnrichmentIntelCardProps {
  enrichmentData: EnrichmentData | null;
  enrichmentStatus?: string | null;
  leadId: string;
  onResearchComplete?: () => void;
}

function buildSectionFlags(data: EnrichmentData) {
  return {
    showWebPresence: !!(data.brave?.website || data.brave?.description),
    showContact: !!(
      data.apollo_match?.email ||
      data.apollo_match?.phone ||
      data.apollo_match?.title
    ),
    showNews: !!(data.tavily?.answer || data.tavily?.results?.length),
  };
}

function DeepResearchButton({
  isResearching,
  onDeepResearch,
}: {
  isResearching: boolean;
  onDeepResearch: () => void;
}) {
  return (
    <Button size="sm" variant="outline" onClick={onDeepResearch} disabled={isResearching}>
      {isResearching ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Search className="h-3 w-3 mr-1" />
      )}
      {isResearching ? 'Researching...' : 'Deep Research'}
    </Button>
  );
}

// eslint-disable-next-line complexity
export function EnrichmentIntelCard({
  enrichmentData,
  enrichmentStatus,
  leadId,
  onResearchComplete,
}: EnrichmentIntelCardProps) {
  const [isResearching, setIsResearching] = useState(false);

  const handleDeepResearch = useCallback(async () => {
    setIsResearching(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/research`, { method: 'POST' });
      if (res.ok) onResearchComplete?.();
    } catch {
      /* Silently fail — user can retry */
    } finally {
      setIsResearching(false);
    }
  }, [leadId, onResearchComplete]);

  if (!enrichmentData || enrichmentStatus !== 'complete') {
    return enrichmentStatus === 'in_progress' ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enrichment Intel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Enrichment in progress...</p>
        </CardContent>
      </Card>
    ) : null;
  }

  const { google_maps, brave, apollo_match, tavily, ai_summary, deep_research } = enrichmentData;
  const hasAnyData = google_maps || brave || apollo_match || tavily || ai_summary;
  if (!hasAnyData) return null;

  const { showWebPresence, showContact, showNews } = buildSectionFlags(enrichmentData);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Enrichment Intel</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              4-Source
            </Badge>
            {!deep_research && (
              <DeepResearchButton
                isResearching={isResearching}
                onDeepResearch={handleDeepResearch}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {ai_summary ? <AiSummarySection summary={ai_summary} /> : null}
        {deep_research ? <DeepResearchSection deep_research={deep_research} /> : null}
        {google_maps ? <GoogleMapsSection google_maps={google_maps} /> : null}
        {showWebPresence ? <WebPresenceSection brave={brave!} /> : null}
        {showContact ? <PrimaryContactSection apollo_match={apollo_match!} /> : null}
        {showNews ? <NewsIntelSection tavily={tavily!} /> : null}
      </CardContent>
    </Card>
  );
}
