'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Search, Plus, UserPlus, DollarSign } from 'lucide-react';
import { useLeads } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { cn } from '@/lib/utils';

const STATUS_BADGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-green-100 text-green-700 border-green-200',
  unqualified: 'bg-red-100 text-red-700 border-red-200',
  nurturing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
  disqualified: 'bg-red-100 text-red-700 border-red-200',
};

function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

export default function LeadsPage() {
  const router = useRouter();
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: leads, isLoading } = useLeads({
    divisionId: activeDivision?.id,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: search || undefined,
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

  const filteredLeads = leads ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
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
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="nurturing">Nurturing</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => router.push('/crm/leads/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No leads yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first lead to start building your pipeline
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/crm/leads/${lead.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{lead.company_name || 'Unnamed Lead'}</h3>
                      <Badge
                        variant="outline"
                        className={cn('text-xs flex-shrink-0 border', STATUS_BADGE_COLORS[lead.status] || '')}
                      >
                        {formatStage(lead.status)}
                      </Badge>
                      {lead.is_qualified && (
                        <Badge className="text-xs bg-green-500 text-white flex-shrink-0">
                          Qualified
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {lead.industry && <span>{lead.industry}</span>}
                      {lead.city && <span>{lead.city}, {lead.province}</span>}
                      {lead.lead_score != null && lead.lead_score > 0 && (
                        <span className={cn(
                          'font-medium',
                          lead.lead_score >= 80 ? 'text-green-600' : lead.lead_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          Score: {lead.lead_score}
                        </span>
                      )}
                      <span>
                        {new Date(lead.created_at).toLocaleDateString('en-CA', {
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
  );
}
