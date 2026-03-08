'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useSetRolePermission } from '@/hooks/useOrg';
import { rolePermissionEditorSchema } from '@/lib/validators/org';
import { toast } from 'sonner';

type FormValues = z.infer<typeof rolePermissionEditorSchema>;

interface RolePermissionEditorFormProps {
  roleId: string;
  permissionId: string;
  permissionLabel: string;
  currentValue?: boolean;
  onSuccess?: () => void;
}

export function RolePermissionEditorForm({
  roleId,
  permissionId,
  permissionLabel,
  currentValue = false,
  onSuccess,
}: RolePermissionEditorFormProps) {
  const setPermission = useSetRolePermission();

  const form = useForm<FormValues>({
    resolver: zodResolver(rolePermissionEditorSchema),
    defaultValues: { role_id: roleId, permission_id: permissionId, granted: currentValue },
  });

  async function onSubmit(values: FormValues) {
    try {
      await setPermission.mutateAsync({ roleId, ...values });
      toast.success('Permission updated');
      onSuccess?.();
    } catch {
      toast.error('Failed to update permission');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-4">
        <FormField
          control={form.control}
          name="granted"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="text-sm font-normal">{permissionLabel}</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" variant="outline" disabled={setPermission.isPending}>
          {setPermission.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Save
        </Button>
      </form>
    </Form>
  );
}
