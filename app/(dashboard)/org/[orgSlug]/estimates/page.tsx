'use client';

import { useState } from 'react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Calculator, DollarSign } from 'lucide-react';
import { useEstimates } from '@/hooks/useEstimates';
import { useDivision } from '@/contexts/DivisionContext';
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

export default function EstimatesListPage() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: estimates, isLoading } = useEstimates({
    divisionId: activeDivision?.id,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 animate-pulse" />
          <Skeleton className="h-10 w-36 animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const filtered = (estimates ?? []).filter((est) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return est.estimate_number.toLowerCase().includes(q);
  });

  return (
    <>
      <title>Estimates — KrewPact</title>
      <div className="space-y-4">
        {/* Filters */}
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

        {/* Estimates List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No estimates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first estimate to start building proposals
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((estimate) => (
              <Card
                key={estimate.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => orgPush(`/estimates/${estimate.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
