'use client';

import { Card, CardContent } from '@/components/ui/card';

interface ExpenseSummaryProps {
  totalAmount: number;
  approvedAmount: number;
  pendingCount: number;
}

export function ExpenseSummary({ totalAmount, approvedAmount, pendingCount }: ExpenseSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground mb-1">Total</div>
          <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground mb-1">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            ${approvedAmount.toLocaleString()}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
