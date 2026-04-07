'use client';

import { Calculator, DollarSign, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getDivisionFilter, useDivision } from '@/contexts/DivisionContext';
import { useEstimates } from '@/hooks/useEstimates';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { cn } from '@/lib/utils';

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  superseded: 'bg-purple-100 text-purple-700 border-purple-200',
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

type Estimate = NonNullable<ReturnType<typeof useEstimates>['data']>[number];
interface EstimateCardProps {
  estimate: Estimate;
  onClick: () => void;
}
function EstimateCard({ estimate, onClick }: EstimateCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold truncate">{estimate.estimate_number}</h3>
          <Badge
            variant="outline"
            className={cn(
              'text-xs flex-shrink-0 border',
              STATUS_BADGE_COLORS[estimate.status] || '',
            )}
          >
            {formatStatus(estimate.status)}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(estimate.total_amount)}
          </span>
          <span>Rev. {estimate.revision_no}</span>
          <span>
            {new Date(estimate.created_at).toLocaleDateString('en-CA', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EstimatesListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48 animate-pulse" />
        <Skeleton className="h-10 w-36 animate-pulse" />
      </div>
      <div className="grid gap-4">
        {['e1', 'e2', 'e3'].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function EstimatesListPage() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const divId = getDivisionFilter(activeDivision);
  const { data: estimates, isLoading } = useEstimates({
    divisionId: divId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  if (isLoading) return <EstimatesListSkeleton />;

  const filtered = (estimates || []).filter(
    (est) => !search || est.estimate_number.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <title>Estimates — KrewPact</title>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search estimates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => orgPush('/estimates/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Calculator className="h-8 w-8" />}
            title="No estimates yet"
            description="Create your first estimate to start building proposals"
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((estimate) => (
              <EstimateCard
                key={estimate.id}
                estimate={estimate}
                onClick={() => orgPush(`/estimates/${estimate.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
