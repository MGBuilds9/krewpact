'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  accountCreateSchema,
  accountUpdateSchema,
  type AccountCreate,
  type AccountUpdate,
} from '@/lib/validators/crm';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAccount, useUpdateAccount, type Account } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { Loader2 } from 'lucide-react';

interface AccountFormProps {
  account?: Account;
  onSuccess?: (account: Account) => void;
  onCancel?: () => void;
}

const ACCOUNT_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'subcontractor', label: 'Subcontractor' },
];

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const isEdit = !!account;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const { activeDivision } = useDivision();

  const form = useForm<AccountCreate | AccountUpdate>({
    resolver: zodResolver(isEdit ? accountUpdateSchema : accountCreateSchema),
    defaultValues: {
      account_name: account?.account_name ?? '',
      account_type: account?.account_type ?? 'prospect',
      division_id: account?.division_id ?? activeDivision?.id ?? undefined,
      notes: account?.notes ?? undefined,
    },
  });

  const isPending = createAccount.isPending || updateAccount.isPending;

  function onSubmit(raw: AccountCreate | AccountUpdate) {
    const values = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as AccountCreate | AccountUpdate;

    if (isEdit && account) {
      updateAccount.mutate(
        { id: account.id, ...values },
        {
          onSuccess: (data) => {
            onSuccess?.(data as Account);
          },
        },
      );
    } else {
      createAccount.mutate(values as AccountCreate, {
        onSuccess: (data) => {
          onSuccess?.(data as Account);
        },
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="account_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Tim Hortons" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="account_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? 'prospect'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notes about this account..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
