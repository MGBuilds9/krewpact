'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitBranch, Plus } from 'lucide-react';
import { useChangeRequests, useChangeOrders } from '@/hooks/useFieldOps';
import { ChangeRequestForm } from '@/components/FieldOps/ChangeRequestForm';
import { ChangeOrderForm } from '@/components/FieldOps/ChangeOrderForm';
import type { ChangeRequest, ChangeOrder } from '@/hooks/useFieldOps';

const CR_STATE_COLORS: Record<ChangeRequest['state'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  void: 'bg-gray-50 text-gray-400',
};

const CO_STATUS_COLORS: Record<ChangeOrder['status'], string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  client_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  void: 'bg-gray-50 text-gray-400',
};

function formatCAD(amount: number | null) {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export default function ChangeOrdersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [crOpen, setCROpen] = useState(false);
  const [coOpen, setCOOpen] = useState(false);

  const { data: crData, isLoading: crLoading } = useChangeRequests(projectId);
  const { data: coData, isLoading: coLoading } = useChangeOrders(projectId);
  const changeRequests = crData?.data ?? [];
  const changeOrders = coData?.data ?? [];

  // Totals
  const totalDelta = changeOrders
    .filter((co) => co.status === 'approved')
    .reduce((sum, co) => sum + (co.amount_delta ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Change Orders</h1>
            <p className="text-sm text-muted-foreground">Approved delta: {formatCAD(totalDelta)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={crOpen} onOpenChange={setCROpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Change Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Change Request</DialogTitle>
              </DialogHeader>
              <ChangeRequestForm
                projectId={projectId}
                onSuccess={() => setCROpen(false)}
                onCancel={() => setCROpen(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={coOpen} onOpenChange={setCOOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Change Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Change Order</DialogTitle>
              </DialogHeader>
              <ChangeOrderForm
                projectId={projectId}
                onSuccess={() => setCOOpen(false)}
                onCancel={() => setCOOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="change-orders">
        <TabsList>
          <TabsTrigger value="change-orders">Change Orders ({changeOrders.length})</TabsTrigger>
          <TabsTrigger value="change-requests">
            Change Requests ({changeRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="change-orders" className="mt-4">
          {coLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : changeOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-25" />
              <p className="text-lg font-medium">No change orders yet</p>
              <p className="text-sm">Create change orders to track contract amendments</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CO Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount Delta</TableHead>
                  <TableHead>Days Delta</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeOrders.map((co) => (
                  <TableRow key={co.id}>
                    <TableCell className="font-mono font-medium">{co.co_number}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CO_STATUS_COLORS[co.status]}`}
                      >
                        {co.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`font-medium ${co.amount_delta && co.amount_delta > 0 ? 'text-red-600' : co.amount_delta && co.amount_delta < 0 ? 'text-green-600' : ''}`}
                    >
                      {formatCAD(co.amount_delta)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {co.days_delta != null
                        ? `${co.days_delta > 0 ? '+' : ''}${co.days_delta}d`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {co.approved_at ? new Date(co.approved_at).toLocaleDateString('en-CA') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="change-requests" className="mt-4">
          {crLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : changeRequests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No change requests yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Est. Days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeRequests.map((cr) => (
                  <TableRow key={cr.id}>
                    <TableCell className="font-mono font-medium">{cr.request_number}</TableCell>
                    <TableCell>
                      <p className="font-medium">{cr.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{cr.description}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CR_STATE_COLORS[cr.state]}`}
                      >
                        {cr.state.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatCAD(cr.estimated_cost_impact)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cr.estimated_days_impact != null ? `${cr.estimated_days_impact}d` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
