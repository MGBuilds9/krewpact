'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api-client';
import { formatStatus } from '@/lib/format-status';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/lib/toast';

export interface Subscription {
  id: string;
  name: string;
  category: string;
  vendor: string | null;
  monthly_cost: number;
  currency: string;
  billing_cycle: string;
  renewal_date: string | null;
  division_id: string | null;
  owner_user_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SubscriptionsResponse {
  data: Subscription[];
}
interface SubscriptionTableProps {
  onEdit: (sub: Subscription) => void;
  onAdd: () => void;
}

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  platform: 'bg-blue-100 text-blue-800 border-blue-300',
  dev_tools: 'bg-purple-100 text-purple-800 border-purple-300',
  marketing: 'bg-green-100 text-green-800 border-green-300',
  operations: 'bg-amber-100 text-amber-800 border-amber-300',
  communications: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  infrastructure: 'bg-slate-100 text-slate-800 border-slate-300',
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
    minimumFractionDigits: 2,
  }).format(amount);
}
function formatDate(dateStr: string | null) {
  return dateStr ? new Date(dateStr).toLocaleDateString('en-CA') : '—';
}

function SubRow({
  sub,
  onEdit,
  onDelete,
  isDeleting,
}: {
  sub: Subscription;
  onEdit: (s: Subscription) => void;
  onDelete: (s: Subscription) => void;
  isDeleting: boolean;
}) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium">{sub.name}</td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={`text-xs capitalize ${CATEGORY_BADGE_CLASSES[sub.category] ?? ''}`}
        >
          {formatStatus(sub.category)}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{sub.vendor ?? '—'}</td>
      <td className="px-4 py-3 text-right font-mono">
        {formatCurrency(sub.monthly_cost ?? 0, sub.currency)}
      </td>
      <td className="px-4 py-3 capitalize text-muted-foreground">{sub.billing_cycle}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(sub.renewal_date)}</td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={
            sub.is_active
              ? 'bg-green-100 text-green-800 border-green-300'
              : 'bg-slate-100 text-slate-500 border-slate-300'
          }
        >
          {sub.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(sub)}
            aria-label={`Edit ${sub.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(sub)}
            disabled={isDeleting}
            aria-label={`Delete ${sub.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

const TABLE_HEADERS = [
  'Name',
  'Category',
  'Vendor',
  'Monthly Cost',
  'Billing Cycle',
  'Renewal Date',
  'Status',
  'Actions',
];

function SubscriptionTableBody({
  subscriptions,
  onEdit,
  onDelete,
  isDeleting,
}: {
  subscriptions: Subscription[];
  onEdit: (s: Subscription) => void;
  onDelete: (s: Subscription) => void;
  isDeleting: boolean;
}) {
  const totalMonthlyCost = subscriptions
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (s.monthly_cost ?? 0), 0);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {TABLE_HEADERS.map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 font-medium text-muted-foreground ${i === 3 || i === 7 ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  No subscriptions yet. Add your first one.
                </td>
              </tr>
            )}
            {subscriptions.map((sub) => (
              <SubRow
                key={sub.id}
                sub={sub}
                onEdit={onEdit}
                onDelete={onDelete}
                isDeleting={isDeleting}
              />
            ))}
          </tbody>
        </table>
      </div>
      {subscriptions.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm">
          <span className="text-muted-foreground">
            {subscriptions.filter((s) => s.is_active).length} active of {subscriptions.length} total
          </span>
          <span className="font-semibold">
            Total active: {formatCurrency(totalMonthlyCost, 'CAD')}/mo
          </span>
        </div>
      )}
    </>
  );
}

export function SubscriptionTable({ onEdit, onAdd }: SubscriptionTableProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.executive.subscriptions.lists(),
    queryFn: () => apiFetch<SubscriptionsResponse>('/api/executive/subscriptions'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/executive/subscriptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.executive.subscriptions.all });
      showToast.success('Subscription deleted');
    },
    onError: () => showToast.error('Failed to delete subscription'),
  });
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
  function confirmDelete() {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Subscriptions</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Subscription
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-12 w-full rounded-md" />
            ))}
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive text-center py-8 px-4">
            Failed to load subscriptions.
          </p>
        )}
        {!isLoading && !isError && (
          <SubscriptionTableBody
            subscriptions={data?.data ?? []}
            onEdit={onEdit}
            onDelete={setDeleteTarget}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </CardContent>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{deleteTarget?.name}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
