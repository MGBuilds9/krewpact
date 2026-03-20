'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
  type CreateItem,
  createItemSchema,
  trackingTypeValues,
  unitOfMeasureValues,
} from '@/lib/validators/inventory-items';

type FormInput = z.input<typeof createItemSchema>;

interface ItemFormProps {
  divisionId: string;
  onSubmit: (data: CreateItem) => void;
  isSubmitting?: boolean;
}

export function ItemForm({ divisionId, onSubmit, isSubmitting }: ItemFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, CreateItem>({
    resolver: zodResolver(createItemSchema),
    defaultValues: { division_id: divisionId, tracking_type: 'none', weight_uom: 'kg' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input id="sku" {...register('sku')} placeholder="e.g. TEL-CAB-001" />
            {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register('name')} placeholder="Item name" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Unit of Measure *</Label>
            <Select
              defaultValue="each"
              onValueChange={(v) => setValue('unit_of_measure', v as CreateItem['unit_of_measure'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitOfMeasureValues.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tracking Type</Label>
            <Select
              defaultValue="none"
              onValueChange={(v) => setValue('tracking_type', v as CreateItem['tracking_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trackingTypeValues.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="min_stock_level">Min Stock Level</Label>
            <Input
              id="min_stock_level"
              type="number"
              {...register('min_stock_level', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_stock_level">Max Stock Level</Label>
            <Input
              id="max_stock_level"
              type="number"
              {...register('max_stock_level', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reorder_qty">Reorder Quantity</Label>
            <Input
              id="reorder_qty"
              type="number"
              {...register('reorder_qty', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Create Item'}
        </Button>
      </div>
    </form>
  );
}
