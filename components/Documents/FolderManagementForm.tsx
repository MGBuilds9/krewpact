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
import { folderCreateSchema } from '@/lib/validators/documents';
import { useCreateFolder } from '@/hooks/useDocuments';
import { toast } from 'sonner';

type FormValues = z.infer<typeof folderCreateSchema>;

interface FolderManagementFormProps {
  projectId: string;
  parentFolderId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FolderManagementForm({
  projectId,
  parentFolderId,
  onSuccess,
  onCancel,
}: FolderManagementFormProps) {
  const createFolder = useCreateFolder(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(folderCreateSchema),
    defaultValues: {
      folder_name: '',
      parent_folder_id: parentFolderId,
      visibility: 'internal',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createFolder.mutateAsync(values);
      toast.success('Folder created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create folder');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="folder_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Folder Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Shop Drawings" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="visibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visibility</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
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
          <Button type="submit" disabled={createFolder.isPending}>
            {createFolder.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Folder
          </Button>
        </div>
      </form>
    </Form>
  );
}
