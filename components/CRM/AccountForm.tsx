'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDivision } from '@/contexts/DivisionContext';
import { type Account, useCreateAccount, useUpdateAccount } from '@/hooks/useCRM';
import {
  type AccountCreate,
  accountCreateSchema,
  type AccountUpdate,
  accountUpdateSchema,
} from '@/lib/validators/crm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormProp = any;

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

function cleanValues(raw: AccountCreate | AccountUpdate): AccountCreate | AccountUpdate {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v])) as
    | AccountCreate
    | AccountUpdate;
}

function buildDefaultValues(account?: Account, divisionId?: string) {
  return {
    account_name: account?.account_name ?? '',
    account_type: account?.account_type ?? 'prospect',
    division_id: account?.division_id ?? divisionId ?? undefined,
    notes: account?.notes ?? undefined,
  };
}

// eslint-disable-next-line max-lines-per-function
function AccountFormFields({
  form,
  isEdit,
  isPending,
  onCancel,
}: {
  form: FormProp;
  isEdit: boolean;
  isPending: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
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
    </>
  );
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const isEdit = !!account;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const { activeDivision } = useDivision();

  const form = useForm<AccountCreate | AccountUpdate>({
    resolver: zodResolver(isEdit ? accountUpdateSchema : accountCreateSchema),
    defaultValues: buildDefaultValues(account, activeDivision?.id),
  });

  const isPending = createAccount.isPending || updateAccount.isPending;

  function onSubmit(raw: AccountCreate | AccountUpdate) {
    const values = cleanValues(raw);
    const cb = { onSuccess: (data: unknown) => onSuccess?.(data as Account) };
    if (isEdit && account) {
      updateAccount.mutate({ id: account.id, ...values }, cb);
    } else {
      createAccount.mutate(values as AccountCreate, cb);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <AccountFormFields form={form} isEdit={isEdit} isPending={isPending} onCancel={onCancel} />
      </form>
    </Form>
  );
}
