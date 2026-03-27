'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { FleetVehicle } from '@/hooks/useFleetVehicles';
import { formatStatus } from '@/lib/format-status';

const statusVariant: Record<FleetVehicle['status'], string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  maintenance: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  decommissioned: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const typeVariant: Record<string, string> = {
  truck: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  van: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  trailer: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  heavy_equipment: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  other: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export const fleetColumns: ColumnDef<FleetVehicle, unknown>[] = [
  {
    accessorKey: 'unit_number',
    header: 'Unit #',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.original.unit_number}</span>
      </div>
    ),
  },
  {
    id: 'vehicle',
    header: 'Year / Make / Model',
    cell: ({ row }) => {
      const { year, make, model } = row.original;
      const parts = [year, make, model].filter(Boolean);
      return parts.length > 0 ? parts.join(' ') : '-';
    },
  },
  {
    accessorKey: 'vehicle_type',
    header: 'Type',
    cell: ({ row }) => {
      const t = row.original.vehicle_type;
      return (
        <Badge variant="outline" className={typeVariant[t] ?? typeVariant.other}>
          {formatStatus(t)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant="outline" className={statusVariant[row.original.status]}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
  {
    accessorKey: 'assigned_to',
    header: 'Assigned To',
    cell: ({ row }) => row.original.assigned_to ?? '-',
  },
  {
    accessorKey: 'license_plate',
    header: 'License Plate',
    cell: ({ row }) => row.original.license_plate ?? '-',
  },
];
