'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useProvisionUser } from '@/hooks/useOrg';
import { userProvisioningSchema } from '@/lib/validators/org';

type FormValues = z.infer<typeof userProvisioningSchema>;

const ROLE_OPTIONS = [
  { key: 'platform_admin', label: 'Platform Admin' },
  { key: 'executive', label: 'Executive' },
  { key: 'operations_manager', label: 'Operations Manager' },
  { key: 'project_manager', label: 'Project Manager' },
  { key: 'project_coordinator', label: 'Project Coordinator' },
  { key: 'estimator', label: 'Estimator' },
  { key: 'field_supervisor', label: 'Field Supervisor' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'payroll_admin', label: 'Payroll Admin' },
];

interface UserProvisioningFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserProvisioningForm({ onSuccess, onCancel }: UserProvisioningFormProps) {
  const provision = useProvisionUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(userProvisioningSchema),
    defaultValues: { email: '', first_name: '', last_name: '', role_keys: [], division_ids: [] },
  });

  const selectedRoles = form.watch('role_keys');

  function toggleRole(roleKey: string) {
    const current = form.getValues('role_keys');
    const next = current.includes(roleKey)
      ? current.filter((r) => r !== roleKey)
      : [...current, roleKey];
    form.setValue('role_keys', next, { shouldValidate: true });
  }

  async function onSubmit(values: FormValues) {
    try {
      await provision.mutateAsync(values);
      toast.success('User provisioned successfully');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to provision user');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@mdmgroupinc.ca" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Roles (optional)</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`prov-role-${key}`}
                  checked={selectedRoles.includes(key)}
                  onCheckedChange={() => toggleRole(key)}
                />
                <Label htmlFor={`prov-role-${key}`} className="cursor-pointer text-sm font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Roles can also be assigned after provisioning from the user list.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={provision.isPending}>
            {provision.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Provision User
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
