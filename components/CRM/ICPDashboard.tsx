'use client';

import { AlertCircle, RefreshCw, Target, TrendingUp, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { ICP } from '@/hooks/useCRM';
import { useGenerateICPs, useICPs, useMatchLeadsToICPs } from '@/hooks/useCRM';

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function ICPCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

function ICPCardMetrics({ icp }: { icp: ICP }) {
  const repeatRatePct = Math.round(icp.repeat_rate_weight * 100);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Avg Deal
        </span>
        <span className="font-semibold">{formatCurrency(icp.avg_deal_value)}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs flex items-center gap-1">
          <Users className="h-3 w-3" />
          Sample
        </span>
        <span className="font-semibold">{icp.sample_size} accounts</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">Repeat Rate</span>
        <span className="font-semibold">{repeatRatePct}%</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">Sources</span>
        <span className="font-semibold text-xs truncate">
          {icp.top_sources.slice(0, 2).join(', ') || '—'}
        </span>
      </div>
    </div>
  );
}

function ICPCard({ icp }: { icp: ICP }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{icp.name}</CardTitle>
          <div className="flex shrink-0 gap-1">
            {icp.is_auto_generated && (
              <Badge variant="secondary" className="text-xs">
                Auto
              </Badge>
            )}
            {icp.is_active ? (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        {icp.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{icp.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        {icp.industry_match.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {icp.industry_match.map((industry) => (
              <Badge key={industry} variant="outline" className="text-xs">
                {industry}
              </Badge>
            ))}
          </div>
        )}
        <ICPCardMetrics icp={icp} />
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{Math.round(icp.confidence_score)}%</span>
          </div>
          <Progress value={icp.confidence_score} className="h-1.5" />
        </div>
        {icp.geography_match && icp.geography_match.cities.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Top cities: </span>
            {icp.geography_match.cities.slice(0, 3).join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusAlert({ variant, message }: { variant: 'success' | 'error'; message: string }) {
  if (variant === 'success')
    return (
      <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
        {message}
      </div>
    );
  return (
    <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-2 text-sm text-destructive flex items-center gap-2">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function spinClass(pending: boolean) {
  return `h-3.5 w-3.5 mr-1.5 ${pending ? 'animate-spin' : ''}`;
}

function ICPHeader({
  icpCount,
  isLoading,
  onGenerate,
  onMatch,
  generatePending,
  matchPending,
}: {
  icpCount: number;
  isLoading: boolean;
  onGenerate: () => void;
  onMatch: () => void;
  generatePending: boolean;
  matchPending: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Ideal Client Profiles</h2>
        {!isLoading && (
          <Badge variant="secondary" className="text-xs">
            {icpCount} profiles
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onMatch}
          disabled={matchPending || icpCount === 0}
        >
          <RefreshCw className={spinClass(matchPending)} />
          {matchPending ? 'Matching…' : 'Match Leads'}
        </Button>
        <Button size="sm" onClick={onGenerate} disabled={generatePending}>
          <RefreshCw className={spinClass(generatePending)} />
          {generatePending ? 'Generating…' : 'Regenerate ICPs'}
        </Button>
      </div>
    </div>
  );
}

function ICPContent({
  isLoading,
  isError,
  icps,
  onGenerate,
  generatePending,
}: {
  isLoading: boolean;
  isError: boolean;
  icps: ICP[];
  onGenerate: () => void;
  generatePending: boolean;
}) {
  if (isLoading)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((n) => (
          <ICPCardSkeleton key={n} />
        ))}
      </div>
    );
  if (isError)
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive font-medium">Failed to load ICPs</p>
        <p className="text-xs text-muted-foreground mt-1">Please refresh the page to try again.</p>
      </div>
    );
  if (icps.length === 0)
    return (
      <div className="rounded-md border border-dashed px-6 py-12 text-center">
        <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-muted-foreground">No ICPs yet</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Generate ICPs automatically from your account history.
        </p>
        <Button size="sm" onClick={onGenerate} disabled={generatePending}>
          <RefreshCw className={spinClass(generatePending)} />
          {generatePending ? 'Generating…' : 'Generate ICPs'}
        </Button>
      </div>
    );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {icps.map((icp) => (
        <ICPCard key={icp.id} icp={icp} />
      ))}
    </div>
  );
}

interface ICPDashboardProps {
  divisionId?: string;
  className?: string;
}

export function ICPDashboard({ divisionId, className }: ICPDashboardProps) {
  const { data, isLoading, isError } = useICPs({ divisionId, isActive: undefined });
  const generateMutation = useGenerateICPs();
  const matchMutation = useMatchLeadsToICPs();
  const icps: ICP[] = data?.data ?? [];

  return (
    <div className={className}>
      <ICPHeader
        icpCount={icps.length}
        isLoading={isLoading}
        onGenerate={() => generateMutation.mutate(undefined)}
        onMatch={() => matchMutation.mutate({ limit: 200 })}
        generatePending={generateMutation.isPending}
        matchPending={matchMutation.isPending}
      />
      {generateMutation.isSuccess && (
        <StatusAlert
          variant="success"
          message={
            (generateMutation.data as { message?: string })?.message ??
            'ICPs regenerated successfully.'
          }
        />
      )}
      {generateMutation.isError && (
        <StatusAlert variant="error" message="Failed to regenerate ICPs. Please try again." />
      )}
      {matchMutation.isSuccess && (
        <StatusAlert
          variant="success"
          message={
            (matchMutation.data as { message?: string })?.message ?? 'Lead matching complete.'
          }
        />
      )}
      {matchMutation.isError && (
        <StatusAlert variant="error" message="Failed to match leads. Please try again." />
      )}
      <ICPContent
        isLoading={isLoading}
        isError={isError}
        icps={icps}
        onGenerate={() => generateMutation.mutate(undefined)}
        generatePending={generateMutation.isPending}
      />
    </div>
  );
}
