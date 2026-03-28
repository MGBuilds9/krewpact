'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type ExpenseCreate } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';

type Project = NonNullable<ReturnType<typeof useProjects>['data']>[number];

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

interface ExpenseFormDialogProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  form: ExpenseCreate;
  setForm: (f: ExpenseCreate) => void;
  projects: Project[] | undefined;
  onCreate: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function ExpenseFormDialog({
  isOpen,
  setIsOpen,
  form,
  setForm,
  projects,
  onCreate,
}: ExpenseFormDialogProps) {
  return (
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
          <Button onClick={onCreate} className="w-full">
            Create Expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
