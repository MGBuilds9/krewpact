'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EnrichmentStatsCards } from './EnrichmentStatsCards';
import { EnrichmentConfigPanel } from './EnrichmentConfigPanel';
import { EnrichmentJobRow } from './EnrichmentJobRow';
import { useEnrichmentJobs } from '@/hooks/useCRM';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;

export function EnrichmentDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const params: Record<string, string> = {
    limit: String(PAGE_SIZE),
    offset: String(page * PAGE_SIZE),
    sort_dir: 'desc',
  };
  if (statusFilter !== 'all') {
    params.status = statusFilter;
  }

  const { data, isLoading } = useEnrichmentJobs(params);
  const jobs = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <EnrichmentStatsCards />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Jobs Table */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base">Enrichment Jobs</CardTitle>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          Loading enrichment jobs...
                        </td>
                      </TableRow>
                    ) : jobs.length === 0 ? (
                      <TableRow>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          No enrichment jobs found.
                        </td>
                      </TableRow>
                    ) : (
                      jobs.map((job) => (
                        <EnrichmentJobRow key={job.id} job={job} />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Config Sidebar */}
        <div className="w-full lg:w-80 shrink-0">
          <EnrichmentConfigPanel />
        </div>
      </div>
    </div>
  );
}
