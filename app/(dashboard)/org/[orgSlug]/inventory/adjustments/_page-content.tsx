'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormSection } from '@/components/shared/FormSection';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useDivision } from '@/contexts/DivisionContext';
import {
  useInventoryItems,
  useStockAdjustment,
  type StockAdjustmentPayload,
} from '@/hooks/useInventory';
import { useInventoryLocations } from '@/hooks/useInventoryLocations';

const REASON_CODES = [
  { value: 'cycle_count', label: 'Cycle Count' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'correction', label: 'Correction' },
  { value: 'other', label: 'Other' },
] as const;

const adjustmentFormSchema = z.object({
  item_id: z.string().uuid('Select an item'),
  location_id: z.string().uuid('Select a location'),
  qty_change: z.number().refine((v) => v !== 0, { message: 'Quantity must not be zero' }),
  reason_code: z.string().min(1, 'Select a reason'),
  notes: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

export default function AdjustmentsPageContent() {
  const { activeDivision } = useDivision();
  const adjust = useStockAdjustment();
  const [submitted, setSubmitted] = useState(false);

  const { data: itemsData } = useInventoryItems({
    divisionId: activeDivision?.id,
    isActive: true,
    limit: 100,
  });

  const { data: locationsData } = useInventoryLocations({
    divisionId: activeDivision?.id,
    isActive: true,
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
  });

  function onSubmit(values: AdjustmentFormValues) {
    if (!activeDivision) return;
    const payload: StockAdjustmentPayload = { ...values, division_id: activeDivision.id };
    adjust.mutate(payload, {
      onSuccess: () => {
        reset();
        setSubmitted(true);
      },
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Adjustment"
        description="Record a quantity gain or loss for any item at a location."
      />

      {submitted && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Adjustment recorded.{' '}
          <button className="underline font-medium" onClick={() => setSubmitted(false)} type="button">
            Record another
          </button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
            <FormSection title="Adjustment Details">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select onValueChange={(v) => setValue('item_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemsData?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.sku} — {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.item_id && (
                  <p className="text-sm text-destructive">{errors.item_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Select onValueChange={(v) => setValue('location_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationsData?.map((loc) => (
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
                <Select onValueChange={(v) => setValue('reason_code', v)}>
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
            </FormSection>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={adjust.isPending || !activeDivision}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {adjust.isPending ? 'Saving...' : 'Submit Adjustment'}
              </Button>
              <Button type="button" variant="outline" onClick={() => reset()}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
