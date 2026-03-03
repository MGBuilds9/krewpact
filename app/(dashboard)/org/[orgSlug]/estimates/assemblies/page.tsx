'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Layers } from 'lucide-react';
import { useAssemblies } from '@/hooks/useEstimating';
import { useDivision } from '@/contexts/DivisionContext';
import { AssemblyBuilderForm } from '@/components/Estimates/AssemblyBuilderForm';
import type { Assembly } from '@/hooks/useEstimating';

export default function AssembliesPage() {
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<Assembly | undefined>();

  const { data, isLoading } = useAssemblies({
    divisionId: activeDivision?.id,
    search: search || undefined,
  });

  const assemblies = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assemblies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => {
            setEditingAssembly(undefined);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Assembly
        </Button>
      </div>

      {assemblies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No assemblies yet</h3>
            <p className="text-muted-foreground mb-4">
              Create reusable assemblies to speed up estimating
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assemblies.map((assembly) => (
            <Card
              key={assembly.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setEditingAssembly(assembly);
                setDialogOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {assembly.assembly_code && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {assembly.assembly_code}
                        </span>
                      )}
                      <h3 className="font-semibold truncate">{assembly.assembly_name}</h3>
                      <Badge
                        variant="outline"
                        className={`text-xs flex-shrink-0 border ${assembly.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                      >
                        {assembly.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Unit: {assembly.unit}</span>
                      <span>v{assembly.version_no}</span>
                      {assembly.description && (
                        <span className="truncate max-w-[300px]">{assembly.description}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssembly ? 'Edit Assembly' : 'New Assembly'}</DialogTitle>
          </DialogHeader>
          <AssemblyBuilderForm
            assembly={editingAssembly}
            divisionId={activeDivision?.id}
            onSuccess={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
