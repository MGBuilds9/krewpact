'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { FleetVehicle } from '@/hooks/useFleetVehicles';
import { formatStatus } from '@/lib/format-status';

const VEHICLE_TYPES = ['truck', 'van', 'trailer', 'heavy_equipment', 'other'] as const;
const STATUSES: FleetVehicle['status'][] = ['active', 'maintenance', 'decommissioned'];
const _OWNERSHIP_TYPES = ['owned', 'leased', 'rented'] as const;

interface FleetFormProps {
  vehicle?: FleetVehicle;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function FleetForm({ vehicle, onSubmit, onCancel, isPending }: FleetFormProps) {
  const { activeDivision } = useDivision();
  const [autoCreateLocation, setAutoCreateLocation] = useState(!vehicle);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      unit_number: fd.get('unit_number'),
      division_id: activeDivision?.id,
      vehicle_type: fd.get('vehicle_type'),
      vin: fd.get('vin') || null,
      year: fd.get('year') ? Number(fd.get('year')) : null,
      make: fd.get('make') || null,
      model: fd.get('model') || null,
      license_plate: fd.get('license_plate') || null,
      status: fd.get('status') || 'active',
      assigned_to: fd.get('assigned_to') || null,
      insurance_expiry: fd.get('insurance_expiry') || null,
      notes: fd.get('notes') || null,
    };
    if (!vehicle && autoCreateLocation) {
      data.auto_create_location = true;
    }
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="unit_number">Unit Number *</Label>
        <Input id="unit_number" name="unit_number" defaultValue={vehicle?.unit_number} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vehicle_type">Vehicle Type *</Label>
        <Select name="vehicle_type" defaultValue={vehicle?.vehicle_type ?? 'truck'}>
          <SelectTrigger id="vehicle_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {formatStatus(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vin">VIN</Label>
        <Input id="vin" name="vin" defaultValue={vehicle?.vin ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="year">Year</Label>
        <Input id="year" name="year" type="number" defaultValue={vehicle?.year ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="make">Make</Label>
        <Input id="make" name="make" defaultValue={vehicle?.make ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="model">Model</Label>
        <Input id="model" name="model" defaultValue={vehicle?.model ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="license_plate">License Plate</Label>
        <Input
          id="license_plate"
          name="license_plate"
          defaultValue={vehicle?.license_plate ?? ''}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={vehicle?.status ?? 'active'}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="assigned_to">Assigned To</Label>
        <Input id="assigned_to" name="assigned_to" defaultValue={vehicle?.assigned_to ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
        <Input
          id="insurance_expiry"
          name="insurance_expiry"
          type="date"
          defaultValue={vehicle?.insurance_expiry ?? ''}
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={(vehicle?.metadata as Record<string, string>)?.notes ?? ''}
        />
      </div>
      {!vehicle && (
        <div className="sm:col-span-2 flex items-center gap-2">
          <Checkbox
            id="auto_location"
            checked={autoCreateLocation}
            onCheckedChange={(v) => setAutoCreateLocation(v === true)}
          />
          <Label htmlFor="auto_location" className="text-sm font-normal">
            Auto-create inventory location for this vehicle
          </Label>
        </div>
      )}
      <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
}
