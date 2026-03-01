'use client';

import { use, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, ShieldCheck, CalendarDays } from 'lucide-react';
import { useWarrantyItems } from '@/hooks/useCloseout';
import { WarrantyItemForm } from '@/components/Closeout/WarrantyItemForm';

export default function WarrantyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data, isLoading } = useWarrantyItems(projectId);
  const [open, setOpen] = useState(false);

  const items = data?.data ?? [];

  function isActive(end: string) {
    return new Date(end) > new Date();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warranty Items</h1>
          <p className="text-sm text-muted-foreground">Track warranties for this project.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Warranty
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Warranty Item</DialogTitle>
            </DialogHeader>
            <WarrantyItemForm projectId={projectId} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No warranty items recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <ShieldCheck className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  {item.provider_name && (
                    <p className="text-sm text-muted-foreground">Provider: {item.provider_name}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {new Date(item.warranty_start).toLocaleDateString('en-CA')} — {new Date(item.warranty_end).toLocaleDateString('en-CA')}
                  </div>
                </div>
                <Badge variant={isActive(item.warranty_end) ? 'default' : 'secondary'}>
                  {isActive(item.warranty_end) ? 'Active' : 'Expired'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
