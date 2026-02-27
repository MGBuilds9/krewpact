'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2 } from 'lucide-react';
import { fileShareCreateSchema } from '@/lib/validators/documents';
import { useCreateFileShare } from '@/hooks/useDocuments';
import { toast } from 'sonner';

type FormValues = z.infer<typeof fileShareCreateSchema>;

interface FileShareFormProps {
  projectId: string;
  fileId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FileShareForm({ projectId, fileId, onSuccess, onCancel }: FileShareFormProps) {
  const createShare = useCreateFileShare(projectId, fileId);

  const form = useForm<FormValues>({
    resolver: zodResolver(fileShareCreateSchema),
    defaultValues: {
      shared_with_user_id: '',
      permission_level: 'view',
      expires_at: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        shared_with_user_id: values.shared_with_user_id || undefined,
        expires_at: values.expires_at || undefined,
      };
      await createShare.mutateAsync(payload as Parameters<typeof createShare.mutateAsync>[0]);
      toast.success('File shared');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to share file');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="shared_with_user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Share With (User ID)</FormLabel>
              <FormControl>
                <Input placeholder="User UUID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="permission_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permission Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select permission" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expires_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expires At (optional)</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createShare.isPending}>
            {createShare.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Share File
          </Button>
        </div>
      </form>
    </Form>
  );
}
