'use client';

import { Plus, Search, Truck } from 'lucide-react';
import { useState } from 'react';

import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { FleetForm } from '@/components/inventory/fleet-form';
import { fleetColumns } from '@/components/inventory/fleet-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivision } from '@/contexts/DivisionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { FleetVehicle } from '@/hooks/useFleetVehicles';
import { useCreateVehicle, useFleetVehicles } from '@/hooks/useFleetVehicles';
import { useOrgRouter } from '@/hooks/useOrgRouter';

const VEHICLE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

export default function FleetPageContent() {
  const { activeDivision } = useDivision();
  const { push: orgPush } = useOrgRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const createVehicle = useCreateVehicle();

  const { data: vehicles, isLoading } = useFleetVehicles({
    divisionId: activeDivision?.id,
    search: debouncedSearch || undefined,
    vehicleType: typeFilter || undefined,
    status: statusFilter || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const items = vehicles ?? [];
  const total = items.length;

  if (isLoading && !vehicles) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Truck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Vehicles</h1>
          <p className="text-muted-foreground text-sm">
            {total} vehicle{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No fleet vehicles</h3>
            <p className="text-muted-foreground mb-4">
              Add your first vehicle to start tracking your fleet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable<FleetVehicle>
          columns={fleetColumns}
          data={items}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          currentSort={sort}
          onRowClick={(v) => orgPush(`/inventory/fleet/${v.id}`)}
          isLoading={isLoading}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
          </DialogHeader>
          <FleetForm
            onSubmit={(data) =>
              createVehicle.mutate(
                data as Record<string, unknown> & { auto_create_location?: boolean },
                { onSuccess: () => setDialogOpen(false) },
              )
            }
            onCancel={() => setDialogOpen(false)}
            isPending={createVehicle.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
