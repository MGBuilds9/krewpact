'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormSection } from '@/components/shared/FormSection';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { type CreateLocation, createLocationSchema, locationTypeValues } from '@/lib/validators/inventory-items';

const TYPE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  job_site: 'Job Site',
  vehicle: 'Vehicle',
};

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisionId: string;
  onSubmit: (data: CreateLocation) => void;
  isSubmitting?: boolean;
}

export function LocationForm({
  open,
  onOpenChange,
  divisionId,
  onSubmit,
  isSubmitting,
}: LocationFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateLocation>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: { division_id: divisionId },
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset({ division_id: divisionId });
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormSection title="Location Details">
            <div className="space-y-2">
              <Label htmlFor="loc-name">Name *</Label>
              <Input id="loc-name" {...register('name')} placeholder="e.g. Main Warehouse" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Select
                onValueChange={(v) =>
                  setValue('location_type', v as CreateLocation['location_type'])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {locationTypeValues.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.location_type && (
                <p className="text-sm text-destructive">{errors.location_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-address">Address</Label>
              <Input id="loc-address" {...register('address')} placeholder="Street address" />
            </div>

          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
