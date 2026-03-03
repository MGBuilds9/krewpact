'use client';

import { useState } from 'react';
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
import { Plus, Database, ChevronRight } from 'lucide-react';
import { useReferenceDataSets, useReferenceDataValues } from '@/hooks/useGovernance';
import { ReferenceDataSetForm } from '@/components/Governance/ReferenceDataSetForm';
import { ReferenceDataValueForm } from '@/components/Governance/ReferenceDataValueForm';

function SetValues({ setId, setName }: { setId: string; setName: string }) {
  const { data, isLoading } = useReferenceDataValues(setId);
  const values = data?.data ?? [];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{setName} — Values</h3>
      <ReferenceDataValueForm setId={setId} />
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-1">
          {values.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
            >
              <code className="text-xs text-muted-foreground">{v.value_key}</code>
              <span className="flex-1">{v.value_name}</span>
              <span className="text-xs text-muted-foreground">#{v.sort_order ?? '—'}</span>
              <Badge variant={v.is_active ? 'default' : 'secondary'} className="text-xs">
                {v.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GovernancePage() {
  const { data, isLoading } = useReferenceDataSets();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');

  const sets = data?.data ?? [];

  return (
    <div className="flex h-full gap-6 p-6">
      <div className="w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reference Data</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reference Data Set</DialogTitle>
              </DialogHeader>
              <ReferenceDataSetForm
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {sets.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedId(s.id);
                  setSelectedName(s.set_name);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted ${selectedId === s.id ? 'bg-muted font-medium' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  {s.set_name}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        {selectedId ? (
          <Card>
            <CardContent className="pt-6">
              <SetValues setId={selectedId} setName={selectedName} />
            </CardContent>
          </Card>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a reference data set to manage values
          </div>
        )}
      </div>
    </div>
  );
}
