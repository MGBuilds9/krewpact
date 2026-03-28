'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';

import { FormSection } from '@/components/shared/FormSection';
import { Button } from '@/components/ui/button';
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

export const REASON_CODES = [
  { value: 'cycle_count', label: 'Cycle Count' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' },
] as const;

export const adjustmentFormSchema = z.object({
  item_id: z.string().uuid('Select an item'),
  location_id: z.string().uuid('Select a location'),
  qty_change: z.number().refine((v) => v !== 0, { message: 'Quantity must not be zero' }),
  reason_code: z.string().min(1, 'Select a reason'),
  notes: z.string().optional(),
});

export type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
}

interface InventoryLocation {
  id: string;
  name: string;
}

interface AdjustmentFormProps {
  register: UseFormRegister<AdjustmentFormValues>;
  errors: FieldErrors<AdjustmentFormValues>;
  items: InventoryItem[] | undefined;
  locations: InventoryLocation[] | undefined;
  isPending: boolean;
  isDisabled: boolean;
  onItemChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onReasonChange: (v: string) => void;
  onReset: () => void;
}

export function AdjustmentForm({
  register,
  errors,
  items,
  locations,
  isPending,
  isDisabled,
  onItemChange,
  onLocationChange,
  onReasonChange,
  onReset,
}: AdjustmentFormProps) {
  return (
    <FormSection title="Adjustment Details">
      <div className="space-y-2">
        <Label>Item *</Label>
        <Select onValueChange={onItemChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent>
            {items?.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.sku} — {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.item_id && <p className="text-sm text-destructive">{errors.item_id.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Location *</Label>
        <Select onValueChange={onLocationChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations?.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.location_id && (
          <p className="text-sm text-destructive">{errors.location_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="qty_change">Quantity Change *</Label>
        <Input
          id="qty_change"
          type="number"
          step="any"
          {...register('qty_change', { valueAsNumber: true })}
          placeholder="-5 for loss, 10 for gain"
        />
        {errors.qty_change && (
          <p className="text-sm text-destructive">{errors.qty_change.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Reason *</Label>
        <Select onValueChange={onReasonChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            {REASON_CODES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.reason_code && (
          <p className="text-sm text-destructive">{errors.reason_code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} rows={2} placeholder="Optional context" />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending || isDisabled}>
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          {isPending ? 'Saving...' : 'Submit Adjustment'}
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          Clear
        </Button>
      </div>
    </FormSection>
  );
}
