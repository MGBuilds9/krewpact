'use client';

import { Calendar, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useExpenses } from '@/hooks/useExpenses';
import { formatStatus } from '@/lib/format-status';

type Expense = NonNullable<ReturnType<typeof useExpenses>['data']>[number];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default',
  submitted: 'secondary',
  rejected: 'destructive',
};

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  return STATUS_VARIANTS[status] ?? 'outline';
}

interface ExpenseRowProps {
  expense: Expense;
  onSubmit: (id: string) => void;
}

export function ExpenseRow({ expense, onSubmit }: ExpenseRowProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-lg">
                ${Number(expense.amount).toLocaleString()}
              </span>
              <Badge variant="outline">{expense.category}</Badge>
              <Badge variant={getStatusVariant(expense.status)}>
                {formatStatus(expense.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {expense.description || 'No description'}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(expense.expense_date).toLocaleDateString()}
              </span>
              {expense.user && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {expense.user.first_name} {expense.user.last_name}
                </span>
              )}
              {expense.project && (
                <span className="text-primary">{expense.project.project_name}</span>
              )}
            </div>
          </div>
          {expense.status === 'draft' && (
            <Button size="sm" variant="outline" onClick={() => onSubmit(expense.id)}>
              Submit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
