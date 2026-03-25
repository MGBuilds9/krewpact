'use client';

import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { formatStatus } from '@/lib/format-status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSuppressionLog } from '@/hooks/crm/useSuppressionLog';
import { useOrgRouter } from '@/hooks/useOrgRouter';

export default function SuppressionLogPage() {
  const { push: orgPush } = useOrgRouter();
  const { data: entries, isLoading } = useSuppressionLog();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => orgPush('/crm/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Suppression Log</h2>
          <p className="text-muted-foreground">
            Leads blocked from outreach sequences due to existing customer matches
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {['a', 'b', 'c', 'd', 'e'].map((key) => (
            <Skeleton key={key} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !entries?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          No suppressed leads found. Leads matching existing customers with 80%+ confidence will
          appear here.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Matched Account</TableHead>
                <TableHead>Match Type</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.lead_id + entry.account_name}>
                  <TableCell
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => orgPush(`/crm/leads/${entry.lead_id}`)}
                  >
                    {entry.company_name}
                  </TableCell>
                  <TableCell>{entry.account_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatStatus(entry.match_type)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {Math.round(entry.match_score * 100)}%
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
