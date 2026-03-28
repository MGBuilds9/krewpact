'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
import type { Lead } from '@/hooks/useCRM';
import { useAccounts, useContacts, useConvertLead } from '@/hooks/useCRM';

interface ConvertLeadDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// eslint-disable-next-line max-lines-per-function
export function ConvertLeadDialog({ lead, open, onOpenChange }: ConvertLeadDialogProps) {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [accountId, setAccountId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('');
  const [opportunityName, setOpportunityName] = useState(lead.company_name);
  const { data: accountsResponse } = useAccounts();
  const { data: contactsResponse } = useContacts();
  const accounts = accountsResponse?.data ?? [];
  const contacts = contactsResponse?.data ?? [];
  const convertLead = useConvertLead();
  const canConvert = lead.status === 'won';

  const handleSubmit = async () => {
    try {
      const result = await convertLead.mutateAsync({
        leadId: lead.id,
        account_id: accountId || undefined,
        contact_id: contactId || undefined,
        opportunity_name: opportunityName || undefined,
      });
      onOpenChange(false);
      router.push(`/org/${orgSlug}/crm/opportunities/${result.id}`);
    } catch {
      // Error is handled by React Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead to Opportunity</DialogTitle>
          <DialogDescription>
            Convert &quot;{lead.company_name}&quot; into an opportunity. Optionally link to an
            account and contact.
          </DialogDescription>
        </DialogHeader>
        {!canConvert && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Lead must be in &quot;won&quot; stage to convert. Current stage: &quot;{lead.status}
            &quot;
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opportunity-name">Opportunity Name</Label>
            <Input
              id="opportunity-name"
              value={opportunityName}
              onChange={(e) => setOpportunityName(e.target.value)}
              placeholder={lead.company_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-select">Account (optional)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="account-select">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-select">Contact (optional)</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger id="contact-select">
                <SelectValue placeholder="Select a contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canConvert || convertLead.isPending}>
            {convertLead.isPending ? 'Converting...' : 'Convert to Opportunity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
