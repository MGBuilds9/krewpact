'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DollarSign, Plus, Calendar, User, Search } from 'lucide-react';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  type ExpenseCreate,
} from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';
import { useDivision } from '@/contexts/DivisionContext';
import { toast } from 'sonner';
import { formatDate } from '@/lib/date';

const CATEGORIES = [
  'Materials',
  'Labor',
  'Equipment',
  'Travel',
  'Meals',
  'Supplies',
  'Subcontractor',
  'Other',
];

function getStatusVariant(status: string) {
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
}

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
    amount: 0,
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    currency_code: 'CAD',
    user_id: '',
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

  const handleCreate = async () => {
    if (!form.amount || !form.category) {
      toast.error('Amount and category are required');
      return;
    }
    try {
      await createExpense.mutateAsync({ ...form, division_id: activeDivision?.id });
      setIsOpen(false);
      setForm({
        amount: 0,
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        currency_code: 'CAD',
        user_id: '',
      });
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
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Log Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount || ''}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Project</Label>
                <Select
                  value={form.project_id || ''}
                  onValueChange={(v) => setForm({ ...form, project_id: v || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="What was the expense for?"
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
              $
              {filteredExpenses
                .filter((e) => e.status === 'approved')
                .reduce((s, e) => s + Number(e.amount), 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredExpenses.filter((e) => e.status === 'submitted').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
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
                        {formatDate(expense.expense_date)}
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
                    <Button size="sm" variant="outline" onClick={() => handleSubmit(expense.id)}>
                      Submit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
