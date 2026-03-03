'use client';

import { useState } from 'react';
import { useCostCodes, useCreateCostCode } from '@/hooks/useProcurement';
import { CostCodeForm } from '@/components/Procurement/CostCodeForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function CostCodesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, error } = useCostCodes();
  const createCostCode = useCreateCostCode();

  function handleCreate(values: Record<string, unknown>) {
    createCostCode.mutate(values as Parameters<typeof createCostCode.mutate>[0], {
      onSuccess: () => setOpen(false),
    });
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading cost codes...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load cost codes.</div>;

  const codes = (data?.data ?? []).filter(
    (c) =>
      !debouncedSearch ||
      c.cost_code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      c.cost_code_name.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cost Code Dictionary</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.total ?? 0} cost codes across all divisions
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Cost Code</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Cost Code</DialogTitle>
            </DialogHeader>
            <CostCodeForm
              onSubmit={handleCreate}
              isLoading={createCostCode.isPending}
              mode="create"
            />
          </DialogContent>
        </Dialog>
      </div>
      <Input
        placeholder="Search cost codes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No cost codes found.
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono text-sm">{code.cost_code}</TableCell>
                  <TableCell>{code.cost_code_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {code.division_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant={code.is_active ? 'default' : 'outline'}>
                      {code.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
