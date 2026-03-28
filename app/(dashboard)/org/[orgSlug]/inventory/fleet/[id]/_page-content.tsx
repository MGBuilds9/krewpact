'use client';

import { AlertTriangle, ArrowLeft, Pencil, Truck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { FleetDetailInfo } from '@/components/inventory/fleet-detail-info';
import { FleetForm } from '@/components/inventory/fleet-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDecommissionVehicle,
  useFleetVehicle,
  useUpdateVehicle,
} from '@/hooks/useFleetVehicles';
import { useOrgRouter } from '@/hooks/useOrgRouter';

// eslint-disable-next-line max-lines-per-function
export default function FleetDetailPageContent() {
  const params = useParams();
  const vehicleId = params.id as string;
  const { push: orgPush } = useOrgRouter();
  const { data: vehicle, isLoading } = useFleetVehicle(vehicleId);
  const updateVehicle = useUpdateVehicle();
  const decommission = useDecommissionVehicle();
  const [editOpen, setEditOpen] = useState(false);
  const [decommissionOpen, setDecommissionOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Vehicle not found</h2>
        <p className="text-muted-foreground mb-4">
          This vehicle may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/inventory/fleet')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Fleet
        </Button>
      </div>
    );
  }

  const yearMakeModel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/inventory/fleet')}
          aria-label="Back to fleet"
          className="mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight truncate">{vehicle.unit_number}</h1>
          </div>
          {yearMakeModel && <p className="text-muted-foreground text-sm mt-1">{yearMakeModel}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          {vehicle.status !== 'decommissioned' && (
            <Button variant="destructive" size="sm" onClick={() => setDecommissionOpen(true)}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Decommission
            </Button>
          )}
        </div>
      </div>

      <FleetDetailInfo vehicle={vehicle} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          <FleetForm
            vehicle={vehicle}
            onSubmit={(data) =>
              updateVehicle.mutate(
                { id: vehicleId, ...data } as Parameters<typeof updateVehicle.mutate>[0],
                { onSuccess: () => setEditOpen(false) },
              )
            }
            onCancel={() => setEditOpen(false)}
            isPending={updateVehicle.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={decommissionOpen} onOpenChange={setDecommissionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decommission Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently decommission {vehicle.unit_number}. Any linked inventory
              location will also be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                decommission.mutate(vehicleId, {
                  onSuccess: () => orgPush('/inventory/fleet'),
                })
              }
            >
              {decommission.isPending ? 'Decommissioning...' : 'Decommission'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
