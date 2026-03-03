'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export interface LinkedEstimateCardProps {
  opportunityId: string;
  estimates: { id: string; estimate_number: string; total_amount: number; status: string }[];
  onCreateEstimate: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
    case 'accepted':
      return 'default';
    case 'draft':
      return 'secondary';
    case 'rejected':
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function LinkedEstimateCard({ estimates, onCreateEstimate }: LinkedEstimateCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Linked Estimates</CardTitle>
        <Button size="sm" variant="outline" onClick={onCreateEstimate}>
          <Plus className="h-4 w-4 mr-1" />
          Create Estimate
        </Button>
      </CardHeader>
      <CardContent>
        {estimates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No estimates linked to this opportunity.</p>
        ) : (
          <ul className="space-y-2">
            {estimates.map((est) => (
              <li key={est.id}>
                <button
                  type="button"
                  className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                  onClick={() => router.push(`/estimates/${est.id}`)}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{est.estimate_number}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {formatCurrency(est.total_amount)}
                    </span>
                  </div>
                  <Badge variant={statusVariant(est.status)}>{est.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
