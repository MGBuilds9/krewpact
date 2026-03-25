'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { SafetyForm } from '@/components/Safety/SafetyForm';
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

type SafetyFormItem = { id: string; form_type: string; form_date: string; state: string };

export function FormsTab({
  forms,
  loading,
  onCreate,
}: {
  forms: SafetyFormItem[];
  loading: boolean;
  onCreate: (v: unknown) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <TabsContent value="forms" className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Form
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Safety Form</DialogTitle>
            </DialogHeader>
            <SafetyForm
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
          {forms.length === 0 && (
            <p className="text-muted-foreground text-sm">No safety forms yet.</p>
          )}
          {forms.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-medium text-sm">{f.form_type}</p>
                  <p className="text-xs text-muted-foreground">{f.form_date}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {f.state}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
