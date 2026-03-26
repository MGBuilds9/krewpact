'use client';

import { PackageCheck, Plus } from 'lucide-react';
import { use, useState } from 'react';

import { CloseoutPackageForm } from '@/components/Closeout/CloseoutPackageForm';
import { DeficiencyItemForm } from '@/components/Closeout/DeficiencyItemForm';
import { ServiceCallForm } from '@/components/Closeout/ServiceCallForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCloseoutPackages, useDeficiencies, useServiceCalls } from '@/hooks/useCloseout';
import { formatStatus } from '@/lib/format-status';

type Pkg = { id: string; status: string };
type Def = { id: string; title: string; severity?: string | null; status: string };
type SvcCall = { id: string; title: string; call_number: string; status: string };

function PackagesTab({
  projectId,
  items,
  loading,
}: {
  projectId: string;
  items: Pkg[];
  loading: boolean;
}) {
  return (
    <TabsContent value="packages" className="mt-4 space-y-4">
      <div className="flex justify-end">
        <CloseoutPackageForm projectId={projectId} onSuccess={() => {}} />
      </div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <PackageCheck className="mb-3 h-10 w-10" />
          <p>No closeout packages yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((pkg, index) => (
            <Card key={pkg.id}>
              <CardContent className="flex items-center justify-between py-3">
                <p className="text-sm font-medium">Package #{index + 1}</p>
                <Badge>{formatStatus(pkg.status)}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}

function DeficienciesTab({
  projectId,
  items,
  loading,
}: {
  projectId: string;
  items: Def[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <TabsContent value="deficiencies" className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Log Deficiency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Deficiency</DialogTitle>
            </DialogHeader>
            <DeficiencyItemForm
              projectId={projectId}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {items.map((def) => (
            <Card key={def.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{def.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {def.severity || 'unset'} severity
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {def.status.replace('_', ' ')}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}

function ServiceCallsTab({
  projectId,
  items,
  loading,
}: {
  projectId: string;
  items: SvcCall[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <TabsContent value="service-calls" className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Service Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service Call</DialogTitle>
            </DialogHeader>
            <ServiceCallForm
              projectId={projectId}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="space-y-2">
          {items.map((sc) => (
            <Card key={sc.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{sc.title}</p>
                  <p className="text-xs text-muted-foreground">{sc.call_number}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {sc.status.replace('_', ' ')}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}

export default function CloseoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: pkgData, isLoading: pkgLoading, isError: pkgError } = useCloseoutPackages(projectId);
  const { data: defData, isLoading: defLoading, isError: defError } = useDeficiencies(projectId);
  const { data: callData, isLoading: callLoading, isError: callError } = useServiceCalls(projectId);

  const packages = pkgData?.data ?? [];
  const deficiencies = defData?.data ?? [];
  const serviceCalls = callData?.data ?? [];

  const hasError = pkgError || defError || callError;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Project Closeout</h1>
        <p className="text-sm text-muted-foreground">
          Manage closeout packages, deficiencies, and service calls.
        </p>
      </div>
      {hasError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          Failed to load some closeout data. Please refresh to try again.
        </div>
      )}
      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
          <TabsTrigger value="deficiencies">Deficiencies ({deficiencies.length})</TabsTrigger>
          <TabsTrigger value="service-calls">Service Calls ({serviceCalls.length})</TabsTrigger>
        </TabsList>
        <PackagesTab projectId={projectId} items={packages as Pkg[]} loading={pkgLoading} />
        <DeficienciesTab projectId={projectId} items={deficiencies as Def[]} loading={defLoading} />
        <ServiceCallsTab
          projectId={projectId}
          items={serviceCalls as SvcCall[]}
          loading={callLoading}
        />
      </Tabs>
    </div>
  );
}
