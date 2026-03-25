'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { InspectionForm } from '@/components/Safety/InspectionForm';
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
import { TabsContent } from '@/components/ui/tabs';

import { LoadingSkeleton } from './LoadingSkeleton';

type Inspection = { id: string; inspection_type: string; inspection_date: string; state: string };

export function InspectionsTab({
  inspections,
  loading,
  onCreate,
}: {
  inspections: Inspection[];
  loading: boolean;
  onCreate: (v: unknown) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <TabsContent value="inspections" className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Inspection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Inspection</DialogTitle>
            </DialogHeader>
            <InspectionForm
              onSubmit={(v) => {
                onCreate(v);
                setDialogOpen(false);
              }}
              isLoading={false}
            />
          </DialogContent>
        </Dialog>
      </div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-2">
          {inspections.length === 0 && (
            <p className="text-muted-foreground text-sm">No inspections recorded.</p>
          )}
          {inspections.map((insp) => (
            <Card key={insp.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-medium text-sm">{insp.inspection_type}</p>
                  <p className="text-xs text-muted-foreground">{insp.inspection_date}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {insp.state}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
