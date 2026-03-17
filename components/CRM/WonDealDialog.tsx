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
import { Textarea } from '@/components/ui/textarea';
import type { Opportunity } from '@/hooks/useCRM';
import { useMarkOpportunityWon } from '@/hooks/useCRM';

interface WonDealDialogProps {
  opportunity: Opportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WonDealDialog({ opportunity, open, onOpenChange }: WonDealDialogProps) {
  const today = new Date().toISOString().split('T')[0];
  const [wonDate, setWonDate] = useState(today);
  const [wonNotes, setWonNotes] = useState('');
  const [syncToErp, setSyncToErp] = useState(false);

  const markWon = useMarkOpportunityWon();

  const canMarkWon = opportunity.stage === 'contracted';

  const handleSubmit = async () => {
    try {
      await markWon.mutateAsync({
        id: opportunity.id,
        won_date: wonDate,
        won_notes: wonNotes || undefined,
        sync_to_erp: syncToErp,
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
          <DialogTitle>Mark Deal as Won</DialogTitle>
          <DialogDescription>
            Mark &quot;{opportunity.opportunity_name}&quot; as a won deal.
          </DialogDescription>
        </DialogHeader>

        {!canMarkWon && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Only opportunities in &quot;contracted&quot; stage can be marked as won. Current stage:
            &quot;{opportunity.stage}&quot;
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="won-date">Won Date</Label>
            <Input
              id="won-date"
              type="date"
              value={wonDate}
              onChange={(e) => setWonDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="won-notes">Notes</Label>
            <Textarea
              id="won-notes"
              value={wonNotes}
              onChange={(e) => setWonNotes(e.target.value)}
              placeholder="Add any notes about the deal..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sync-to-erp"
              checked={syncToErp}
              onCheckedChange={(checked) => setSyncToErp(checked === true)}
            />
            <Label htmlFor="sync-to-erp">Sync to ERPNext</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canMarkWon || markWon.isPending}>
            {markWon.isPending ? 'Saving...' : 'Mark as Won'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
