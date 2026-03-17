'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Opportunity } from '@/hooks/useCRM';
import { useMarkOpportunityLost } from '@/hooks/useCRM';

const LOST_REASONS = [
  'Budget',
  'Timeline',
  'Competition',
  'Scope Change',
  'No Response',
  'Other',
] as const;

interface LostDealDialogProps {
  opportunity: Opportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LostDealDialog({ opportunity, open, onOpenChange }: LostDealDialogProps) {
  const [lostReason, setLostReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');
  const [competitor, setCompetitor] = useState('');
  const [reopenAsLead, setReopenAsLead] = useState(false);
  const markLost = useMarkOpportunityLost();
  const isAlreadyLost = opportunity.stage === 'closed_lost';
  const canMarkLost = !isAlreadyLost && lostReason.length > 0;

  const handleSubmit = async () => {
    try {
      await markLost.mutateAsync({
        id: opportunity.id,
        lost_reason: lostReason,
        lost_notes: lostNotes || undefined,
        competitor: competitor || undefined,
        reopen_as_lead: reopenAsLead,
      });
      onOpenChange(false);
    } catch {
      // Error handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Deal as Lost</DialogTitle>
          <DialogDescription>
            Mark &quot;{opportunity.opportunity_name}&quot; as a lost deal.
          </DialogDescription>
        </DialogHeader>
        {isAlreadyLost && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            This opportunity is already marked as lost.
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lost-reason">Lost Reason</Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger id="lost-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lost-notes">Notes</Label>
            <Textarea
              id="lost-notes"
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              placeholder="Additional details about why the deal was lost..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="competitor-name">Competitor (optional)</Label>
            <Input
              id="competitor-name"
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder="Name of competing company"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reopen-as-lead"
              checked={reopenAsLead}
              onCheckedChange={(checked) => setReopenAsLead(checked === true)}
            />
            <Label htmlFor="reopen-as-lead">Re-open as Lead for re-nurture</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canMarkLost || markLost.isPending}
            variant="destructive"
          >
            {markLost.isPending ? 'Saving...' : 'Mark as Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
