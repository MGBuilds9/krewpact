'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  getDivisionFilter,
  requireConcreteDivision,
  useDivision,
} from '@/contexts/DivisionContext';
import { useAccounts } from '@/hooks/crm/useAccounts';
import { useOpportunities } from '@/hooks/crm/useOpportunities';
import { useCreateEstimate } from '@/hooks/useEstimates';
import { useOrgRouter } from '@/hooks/useOrgRouter';

const CURRENCIES = ['CAD', 'USD'] as const;

// eslint-disable-next-line max-lines-per-function
export default function NewEstimatePageContent() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision, userDivisions } = useDivision();
  const createEstimate = useCreateEstimate();

  // Reads (opportunities/accounts pickers): pass undefined when sentinel so
  // the user sees options across all divisions they can access.
  const readDivisionId = getDivisionFilter(activeDivision);
  // Estimate creation requires a concrete division — fall back to primary.
  const writeDivisionId = requireConcreteDivision(activeDivision, userDivisions) ?? '';
  const { data: opportunitiesResp } = useOpportunities({ divisionId: readDivisionId });
  const { data: accountsResp } = useAccounts({ divisionId: readDivisionId });
  const opportunities = opportunitiesResp?.data ?? [];
  const accounts = accountsResp?.data ?? [];

  const [opportunityId, setOpportunityId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('');
  const [currency, setCurrency] = useState<string>('CAD');
  const [notes, setNotes] = useState('');

  const handleOpportunityChange = (value: string) => {
    setOpportunityId(value);
    if (value && value !== '_none') {
      const opp = opportunities.find((o) => o.id === value);
      if (opp?.account_id) setAccountId(opp.account_id);
      if (opp?.contact_id) setContactId(opp.contact_id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeDivisionId) return;

    createEstimate.mutate(
      {
        division_id: writeDivisionId,
        opportunity_id: opportunityId && opportunityId !== '_none' ? opportunityId : undefined,
        account_id: accountId && accountId !== '_none' ? accountId : undefined,
        contact_id: contactId && contactId !== '_none' ? contactId : undefined,
        currency_code: currency,
      },
      {
        onSuccess: (data) => {
          orgPush(`/estimates/${data.id}`);
        },
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/estimates')}
          aria-label="Back to estimates"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Estimate</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimate Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="division">Division</Label>
              <Input
                id="division"
                value={
                  writeDivisionId
                    ? (userDivisions.find((d) => d.id === writeDivisionId)?.name ??
                      'Unknown division')
                    : 'No division selected'
                }
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opportunity">Opportunity</Label>
              <Select value={opportunityId} onValueChange={handleOpportunityChange}>
                <SelectTrigger id="opportunity">
                  <SelectValue placeholder="Select an opportunity (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {opportunities.map((opp) => (
                    <SelectItem key={opp.id} value={opp.id}>
                      {opp.opportunity_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Select an account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes about this estimate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => orgPush('/estimates')}>
                Cancel
              </Button>
              <Button type="submit" disabled={!writeDivisionId || createEstimate.isPending}>
                {createEstimate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Estimate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
