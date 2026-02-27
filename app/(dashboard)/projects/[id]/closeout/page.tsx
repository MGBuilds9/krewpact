'use client';

import { use, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, PackageCheck } from 'lucide-react';
import { useCloseoutPackages, useDeficiencies, useServiceCalls } from '@/hooks/useCloseout';
import { CloseoutPackageForm } from '@/components/Closeout/CloseoutPackageForm';
import { DeficiencyItemForm } from '@/components/Closeout/DeficiencyItemForm';
import { ServiceCallForm } from '@/components/Closeout/ServiceCallForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CloseoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: pkgData, isLoading: pkgLoading } = useCloseoutPackages(projectId);
  const { data: defData, isLoading: defLoading } = useDeficiencies(projectId);
  const { data: callData, isLoading: callLoading } = useServiceCalls(projectId);
  const [defOpen, setDefOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  const packages = pkgData?.data ?? [];
  const deficiencies = defData?.data ?? [];
  const serviceCalls = callData?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Closeout</h1>
          <p className="text-sm text-muted-foreground">Manage closeout packages, deficiencies, and service calls.</p>
        </div>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
          <TabsTrigger value="deficiencies">Deficiencies ({deficiencies.length})</TabsTrigger>
          <TabsTrigger value="service-calls">Service Calls ({serviceCalls.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <CloseoutPackageForm projectId={projectId} onSuccess={() => {}} />
          </div>
          {pkgLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : packages.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <PackageCheck className="mb-3 h-10 w-10" />
              <p>No closeout packages yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <p className="text-sm text-muted-foreground">Package {pkg.id.slice(0, 8)}</p>
                    <Badge className="capitalize">{pkg.status.replace('_', ' ')}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deficiencies" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={defOpen} onOpenChange={setDefOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Log Deficiency</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Deficiency</DialogTitle></DialogHeader>
                <DeficiencyItemForm projectId={projectId} onSuccess={() => setDefOpen(false)} onCancel={() => setDefOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          {defLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="space-y-2">
              {deficiencies.map((def) => (
                <Card key={def.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{def.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{def.severity ?? 'unset'} severity</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{def.status.replace('_', ' ')}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="service-calls" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={callOpen} onOpenChange={setCallOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />New Service Call</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Service Call</DialogTitle></DialogHeader>
                <ServiceCallForm projectId={projectId} onSuccess={() => setCallOpen(false)} onCancel={() => setCallOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          {callLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="space-y-2">
              {serviceCalls.map((sc) => (
                <Card key={sc.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{sc.title}</p>
                      <p className="text-xs text-muted-foreground">{sc.call_number}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{sc.status.replace('_', ' ')}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
