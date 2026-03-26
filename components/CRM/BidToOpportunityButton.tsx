'use client';

import { ArrowRightCircle } from 'lucide-react';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { BiddingOpportunity } from '@/hooks/useCRM';
import { apiFetch } from '@/lib/api-client';

interface BidToOpportunityButtonProps {
  bid: BiddingOpportunity;
  onConverted?: (opportunityId: string) => void;
}

export function BidToOpportunityButton({ bid, onConverted }: BidToOpportunityButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAlreadyLinked = !!bid.opportunity_id;

  async function handleConfirm() {
    setLoading(true);
    try {
      const result = await apiFetch<{ opportunity_id: string }>(
        `/api/crm/bidding/${bid.id}/convert`,
        { method: 'POST' },
      );
      onConverted?.(result.opportunity_id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
       
      console.error('Bid conversion failed', message);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  const valueFormatted =
    bid.estimated_value != null
      ? new Intl.NumberFormat('en-CA', {
          style: 'currency',
          currency: 'CAD',
          maximumFractionDigits: 0,
        }).format(bid.estimated_value)
      : null;

  return (
    <>
      <Button
        size="sm"
        variant={isAlreadyLinked ? 'secondary' : 'outline'}
        disabled={isAlreadyLinked || loading}
        onClick={() => setOpen(true)}
        title={isAlreadyLinked ? 'Already linked to an opportunity' : 'Convert to opportunity'}
      >
        <ArrowRightCircle className="mr-1.5 h-4 w-4" />
        {isAlreadyLinked ? 'Linked' : 'To Opportunity'}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Bid to Opportunity?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  A new CRM opportunity will be created from this bid. The bid will remain in the
                  bidding pipeline.
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-1">
                  <dt className="font-medium text-foreground">Title</dt>
                  <dd>{bid.title}</dd>
                  {valueFormatted && (
                    <>
                      <dt className="font-medium text-foreground">Value</dt>
                      <dd>{valueFormatted}</dd>
                    </>
                  )}
                  {bid.deadline && (
                    <>
                      <dt className="font-medium text-foreground">Deadline</dt>
                      <dd>{bid.deadline}</dd>
                    </>
                  )}
                </dl>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? 'Converting…' : 'Convert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
