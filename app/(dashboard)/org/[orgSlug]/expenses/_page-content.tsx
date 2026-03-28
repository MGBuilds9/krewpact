'use client';

import { DollarSign } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivision } from '@/contexts/DivisionContext';
import {
  type ExpenseCreate,
  useCreateExpense,
  useExpenses,
  useUpdateExpense,
} from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';

import { ExpenseFilterBar } from './_components/ExpenseFilterBar';
import { ExpenseFormDialog } from './_components/ExpenseFormDialog';
import { ExpenseRow } from './_components/ExpenseRow';
import { ExpenseSummary } from './_components/ExpenseSummary';

const EMPTY_FORM: ExpenseCreate = {
  amount: 0,
  category: '',
  expense_date: new Date().toISOString().split('T')[0],
  description: '',
  currency_code: 'CAD',
  user_id: '',
};

// eslint-disable-next-line max-lines-per-function
export default function ExpensesPage() {
  const { activeDivision } = useDivision();
  const { data: expenses, isLoading } = useExpenses();
  const { data: projects } = useProjects({ divisionId: activeDivision?.id });
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const [isOpen, setIsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ExpenseCreate>({
    ...EMPTY_FORM,
    expense_date: new Date().toISOString().split('T')[0],
  });

  const filteredExpenses = (expenses ?? []).filter((e) => {
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesSearch =
      !search ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const approvedAmount = filteredExpenses
    .filter((e) => e.status === 'approved')
    .reduce((s, e) => s + Number(e.amount), 0);
  const pendingCount = filteredExpenses.filter((e) => e.status === 'submitted').length;

  const handleCreate = async () => {
    if (!form.amount || !form.category) {
      toast.error('Amount and category are required');
      return;
    }
    try {
      await createExpense.mutateAsync({ ...form, division_id: activeDivision?.id });
      setIsOpen(false);
      setForm({ ...EMPTY_FORM, expense_date: new Date().toISOString().split('T')[0] });
      toast.success('Expense created');
    } catch {
      toast.error('Failed to create expense');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await updateExpense.mutateAsync({ id, status: 'submitted' } as never);
      toast.success('Expense submitted for approval');
    } catch {
      toast.error('Failed to submit expense');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['s1', 's2', 's3'].map((id) => (
            <Skeleton key={id} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">{filteredExpenses.length} expenses</p>
          </div>
        </div>
        <ExpenseFormDialog
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          form={form}
          setForm={setForm}
          projects={projects}
          onCreate={handleCreate}
        />
      </div>

      <ExpenseSummary
        totalAmount={totalAmount}
        approvedAmount={approvedAmount}
        pendingCount={pendingCount}
      />
      <ExpenseFilterBar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No expenses</h3>
            <p className="text-muted-foreground">Log your first expense to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} onSubmit={handleSubmit} />
          ))}
        </div>
      )}
    </div>
  );
}
