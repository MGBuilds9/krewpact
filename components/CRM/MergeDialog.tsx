'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMergeAccounts, useMergeContacts } from '@/hooks/useCRM';

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'account' | 'contact';
  entities: Array<{ id: string; [key: string]: unknown }>;
  onMergeComplete: () => void;
}

const ACCOUNT_FIELDS = [
  { key: 'account_name', label: 'Account Name' },
  { key: 'account_type', label: 'Account Type' },
  { key: 'billing_address', label: 'Billing Address' },
  { key: 'notes', label: 'Notes' },
] as const;

const CONTACT_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'role_title', label: 'Role / Title' },
] as const;

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function MergeDialog({
  open,
  onOpenChange,
  entityType,
  entities,
  onMergeComplete,
}: MergeDialogProps) {
  const [primaryId, setPrimaryId] = useState<string>('');
  const mergeAccounts = useMergeAccounts();
  const mergeContacts = useMergeContacts();

  const fields = entityType === 'account' ? ACCOUNT_FIELDS : CONTACT_FIELDS;
  const mutation = entityType === 'account' ? mergeAccounts : mergeContacts;

  const handleMerge = async () => {
    const secondaryId = entities.find((e) => e.id !== primaryId)?.id;
    if (!primaryId || !secondaryId) return;

    try {
      await mutation.mutateAsync({
        primary_id: primaryId,
        secondary_id: secondaryId,
      });
      onMergeComplete();
      onOpenChange(false);
      setPrimaryId('');
    } catch {
      // Error handled by React Query
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setPrimaryId('');
  };

  if (entities.length !== 2) return null;

  const entityLabel = entityType === 'account' ? 'Account' : 'Contact';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge {entityLabel}s</DialogTitle>
          <DialogDescription>
            Select the primary record to keep. The secondary record will be merged
            into it and then removed. All related data will be reassigned to the
            primary record.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={primaryId} onValueChange={setPrimaryId}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className={`rounded-lg border p-4 transition-colors ${
                  primaryId === entity.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <RadioGroupItem value={entity.id} id={`primary-${entity.id}`} />
                  <Label
                    htmlFor={`primary-${entity.id}`}
                    className="cursor-pointer font-medium"
                  >
                    {primaryId === entity.id ? (
                      <Badge variant="default">Primary</Badge>
                    ) : (
                      <Badge variant="secondary">Secondary</Badge>
                    )}
                  </Label>
                </div>

                <dl className="space-y-2">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <dt className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </dt>
                      <dd className="text-sm">
                        {formatValue(entity[field.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!primaryId || mutation.isPending}
          >
            {mutation.isPending ? 'Merging...' : `Merge ${entityLabel}s`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
