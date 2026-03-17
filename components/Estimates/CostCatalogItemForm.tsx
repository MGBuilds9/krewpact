'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CostCatalogItem } from '@/hooks/useEstimating';
import { useCreateCostCatalogItem, useUpdateCostCatalogItem } from '@/hooks/useEstimating';

const itemTypes = ['material', 'labor', 'equipment', 'subcontract', 'other'] as const;

const formSchema = z.object({
  item_code: z.string().max(50).optional(),
  item_name: z.string().min(1, 'Name is required').max(200),
  item_type: z.enum(itemTypes),
  unit: z.string().min(1, 'Unit is required').max(20),
  base_cost: z.string().min(1, 'Cost is required'),
  vendor_name: z.string().max(200).optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().optional(),
  division_id: z.string().uuid().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface CostCatalogItemFormProps {
  item?: CostCatalogItem;
  divisionId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const itemTypeLabels: Record<string, string> = {
  material: 'Material',
  labor: 'Labor',
  equipment: 'Equipment',
  subcontract: 'Subcontract',
  other: 'Other',
};

function buildItemNames(item?: CostCatalogItem) {
  return {
    item_code: item?.item_code ?? '',
    item_name: item?.item_name ?? '',
    unit: item?.unit ?? '',
    vendor_name: item?.vendor_name ?? '',
  };
}

function buildDefaultValues(item?: CostCatalogItem, divisionId?: string) {
  return {
    ...buildItemNames(item),
    item_type: (item?.item_type as FormValues['item_type']) ?? 'material',
    base_cost: item?.base_cost?.toString() ?? '0',
    effective_from: item?.effective_from ?? '',
    effective_to: item?.effective_to ?? '',
    division_id: item?.division_id ?? divisionId,
  };
}

export function CostCatalogItemForm({
  item,
  divisionId,
  onSuccess,
  onCancel,
}: CostCatalogItemFormProps) {
  const createItem = useCreateCostCatalogItem();
  const updateItem = useUpdateCostCatalogItem();
  const isEditing = !!item;
  const cb = {
    onSuccess: () => {
      form.reset();
      onSuccess?.();
    },
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(item, divisionId),
  });

  const isPending = createItem.isPending || updateItem.isPending;

  function onSubmit(values: FormValues) {
    const baseCost = parseFloat(values.base_cost);
    if (isNaN(baseCost) || baseCost < 0) {
      form.setError('base_cost', { message: 'Must be a valid non-negative number' });
      return;
    }
    const payload = {
      item_code: values.item_code || undefined,
      item_name: values.item_name,
      item_type: values.item_type,
      unit: values.unit,
      base_cost: baseCost,
      vendor_name: values.vendor_name || undefined,
      effective_from: values.effective_from || undefined,
      effective_to: values.effective_to || undefined,
      division_id: values.division_id,
    };
    if (isEditing) {
      updateItem.mutate({ id: item.id, ...payload }, cb);
    } else {
      createItem.mutate(payload, cb);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="item_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. MAT-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="item_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {itemTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {itemTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="item_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 2x4 Lumber" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. LF, EA, SF" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="base_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Cost (CAD) *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="vendor_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Home Depot" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="effective_from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective From</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effective_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective To</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Item' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
