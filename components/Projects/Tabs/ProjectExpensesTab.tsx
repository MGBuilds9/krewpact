'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Calendar, User } from 'lucide-react';
import { useProjectExpenses } from '@/hooks/useProjectExpenses';

interface ProjectExpensesTabProps {
  projectId: string;
}

export function ProjectExpensesTab({ projectId }: ProjectExpensesTabProps) {
  const { data: expenses = [], isLoading } = useProjectExpenses(projectId);

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const approvedAmount = expenses
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default' as const;
      case 'submitted':
        return 'secondary' as const;
      case 'rejected':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Project Expenses</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Total Expenses
            </div>
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Approved
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${approvedAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Count</div>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : expenses.length > 0 ? (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">
                        ${Number(expense.amount).toLocaleString()}
                      </span>
                      <Badge variant="outline">{expense.category}</Badge>
                      <Badge variant={getStatusVariant(expense.status)}>{expense.status}</Badge>
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
            <p className="text-muted-foreground">
              Expenses linked to this project will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
