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
import { useSetPortalPermission } from '@/hooks/usePortals';
import { formatStatus } from '@/lib/format-status';
import { portalPermissionSchema } from '@/lib/validators/portals';

type FormValues = z.infer<typeof portalPermissionSchema>;

interface PortalPermissionFormProps {
  portalAccountId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const defaultPermissions = ['view_project', 'view_documents', 'view_schedule', 'submit_messages'];

export function PortalPermissionForm({
  portalAccountId,
  onSuccess,
  onCancel,
}: PortalPermissionFormProps) {
  const setPermission = useSetPortalPermission();

  const form = useForm<FormValues>({
    resolver: zodResolver(portalPermissionSchema),
    defaultValues: {
      portal_account_id: portalAccountId,
      project_id: '',
      permission_set: {},
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await setPermission.mutateAsync(values);
      toast.success('Permissions updated');
      onSuccess?.();
    } catch {
      toast.error('Failed to update permissions');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project ID</FormLabel>
              <FormControl>
                <Input placeholder="Project UUID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Permissions</FormLabel>
          {defaultPermissions.map((perm) => (
            <div key={perm} className="flex items-center gap-2">
              <Checkbox
                id={perm}
                onCheckedChange={(checked) => {
                  const current = form.getValues('permission_set') as Record<string, boolean>;
                  form.setValue('permission_set', { ...current, [perm]: !!checked });
                }}
              />
              <label htmlFor={perm} className="text-sm font-medium capitalize">
                {formatStatus(perm)}
              </label>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={setPermission.isPending}>
            {setPermission.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Permissions
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
