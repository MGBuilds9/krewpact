'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FleetVehicle } from '@/hooks/useFleetVehicles';
import { formatStatus } from '@/lib/format-status';

const statusStyle: Record<FleetVehicle['status'], string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  maintenance: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  decommissioned: 'bg-red-500/15 text-red-400 border-red-500/30',
};

interface FleetDetailInfoProps {
  vehicle: FleetVehicle;
}

function InfoField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm mt-0.5">{value ?? '-'}</dd>
    </div>
  );
}

export function FleetDetailInfo({ vehicle }: FleetDetailInfoProps) {
  const typeLabel = formatStatus(vehicle.vehicle_type);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Information</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoField label="Unit Number" value={vehicle.unit_number} />
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <Badge variant="outline" className={statusStyle[vehicle.status]}>
                {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
              </Badge>
            </dd>
          </div>
          <InfoField label="Vehicle Type" value={typeLabel} />
          <InfoField label="Year" value={vehicle.year} />
          <InfoField label="Make" value={vehicle.make} />
          <InfoField label="Model" value={vehicle.model} />
          <InfoField label="VIN" value={vehicle.vin} />
          <InfoField label="License Plate" value={vehicle.license_plate} />
          <InfoField label="Assigned To" value={vehicle.assigned_to} />
          <InfoField
            label="Insurance Expiry"
            value={
              vehicle.insurance_expiry
                ? new Date(vehicle.insurance_expiry).toLocaleDateString('en-CA')
                : null
            }
          />
          <InfoField
            label="Last Inspection"
            value={
              vehicle.last_inspection_date
                ? new Date(vehicle.last_inspection_date).toLocaleDateString('en-CA')
                : null
            }
          />
          <InfoField
            label="Odometer"
            value={
              vehicle.odometer_reading ? `${vehicle.odometer_reading.toLocaleString()} km` : null
            }
          />
          <InfoField label="Inventory Location" value={vehicle.location_id ?? 'None'} />
        </dl>
      </CardContent>
    </Card>
  );
}
