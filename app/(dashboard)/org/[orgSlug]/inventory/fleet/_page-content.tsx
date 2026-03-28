'use client';

import { Truck } from 'lucide-react';
import { useState } from 'react';

import { DataTable, type SortState } from '@/components/CRM/DataTable';
import { FleetForm } from '@/components/inventory/fleet-form';
import { fleetColumns } from '@/components/inventory/fleet-table';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivision } from '@/contexts/DivisionContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { FleetVehicle } from '@/hooks/useFleetVehicles';
import { useCreateVehicle, useFleetVehicles } from '@/hooks/useFleetVehicles';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { FleetFiltersBar } from './_components/FleetFiltersBar';

// eslint-disable-next-line max-lines-per-function
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

      <FleetFiltersBar
        search={search}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        onTypeChange={(v) => {
          setTypeFilter(v);
          setPage(0);
        }}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(0);
        }}
        onAddVehicle={() => setDialogOpen(true)}
      />

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
