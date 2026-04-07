'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import {
  getDivisionFilter,
  requireConcreteDivision,
  useDivision,
} from '@/contexts/DivisionContext';
import {
  type StockAdjustmentPayload,
  useInventoryItems,
  useStockAdjustment,
} from '@/hooks/useInventory';
import { useInventoryLocations } from '@/hooks/useInventoryLocations';

import {
  AdjustmentForm,
  adjustmentFormSchema,
  type AdjustmentFormValues,
} from './_components/AdjustmentForm';

export default function AdjustmentsPageContent() {
  const { activeDivision, userDivisions } = useDivision();
  const adjust = useStockAdjustment();
  const [submitted, setSubmitted] = useState(false);

  const readDivisionId = getDivisionFilter(activeDivision);
  // Stock adjustments must be scoped to a concrete division — fall back to the
  // user's primary division when "All Divisions" is the active view.
  const writeDivisionId = requireConcreteDivision(activeDivision, userDivisions);

  const { data: itemsData } = useInventoryItems({
    divisionId: readDivisionId,
    isActive: true,
    limit: 100,
  });

  const { data: locationsData } = useInventoryLocations({
    divisionId: readDivisionId,
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
    if (!writeDivisionId) return;
    const payload: StockAdjustmentPayload = { ...values, division_id: writeDivisionId };
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
          <button
            className="underline font-medium"
            onClick={() => setSubmitted(false)}
            type="button"
          >
            Record another
          </button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
            <AdjustmentForm
              register={register}
              errors={errors}
              items={itemsData}
              locations={locationsData}
              isPending={adjust.isPending}
              isDisabled={!writeDivisionId}
              onItemChange={(v) => setValue('item_id', v)}
              onLocationChange={(v) => setValue('location_id', v)}
              onReasonChange={(v) => setValue('reason_code', v)}
              onReset={() => reset()}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
