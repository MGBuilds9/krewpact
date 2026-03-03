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
import { Plus, ListChecks } from 'lucide-react';
import { useSelectionSheets } from '@/hooks/useSelections';
import { SelectionSheetForm } from '@/components/Selections/SelectionSheetForm';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-400',
  issued: 'bg-blue-500',
  client_review: 'bg-yellow-500',
  approved: 'bg-green-500',
  locked: 'bg-purple-500',
};

export default function SelectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data, isLoading } = useSelectionSheets(projectId);
  const [open, setOpen] = useState(false);

  const sheets = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Selections</h1>
          <p className="text-sm text-muted-foreground">
            Manage selection sheets, options, and client choices.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sheet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Selection Sheet</DialogTitle>
            </DialogHeader>
            <SelectionSheetForm
              projectId={projectId}
              onSuccess={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ListChecks className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No selection sheets yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sheets.map((sheet) => (
            <Card key={sheet.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{sheet.sheet_name}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${STATUS_COLORS[sheet.status] ?? 'bg-gray-400'}`}
                    />
                    <span className="text-xs capitalize text-muted-foreground">
                      {sheet.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(sheet.created_at).toLocaleDateString('en-CA')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
