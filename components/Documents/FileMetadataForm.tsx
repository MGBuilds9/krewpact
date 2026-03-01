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
import { fileMetadataCreateSchema } from '@/lib/validators/documents';
import { useCreateFile } from '@/hooks/useDocuments';
import { toast } from 'sonner';

const formSchema = z.object({
  storage_bucket: z.string().min(1),
  file_path: z.string().min(1),
  filename: z.string().min(1),
  original_filename: z.string().min(1),
  mime_type: z.string().optional(),
  file_size_bytes: z.string(),
  visibility: z.enum(['internal', 'client', 'trade', 'public']).optional(),
  folder_id: z.string().uuid().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FileMetadataFormProps {
  projectId: string;
  folderId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FileMetadataForm({
  projectId,
  folderId,
  onSuccess,
  onCancel,
}: FileMetadataFormProps) {
  const createFile = useCreateFile(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storage_bucket: '',
      file_path: '',
      filename: '',
      original_filename: '',
      mime_type: '',
      file_size_bytes: '0',
      visibility: 'internal',
      folder_id: folderId,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = fileMetadataCreateSchema.parse({
        ...values,
        file_size_bytes: parseFloat(values.file_size_bytes),
      });
      await createFile.mutateAsync(payload as Parameters<typeof createFile.mutateAsync>[0]);
      toast.success('File registered');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to register file');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="filename"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Site Plan Rev 2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="original_filename"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Original Filename</FormLabel>
              <FormControl>
                <Input placeholder="e.g. site-plan-rev2.pdf" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="storage_bucket"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Bucket</FormLabel>
                <FormControl>
                  <Input placeholder="project-files" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="file_path"
            render={({ field }) => (
              <FormItem>
                <FormLabel>File Path</FormLabel>
                <FormControl>
                  <Input placeholder="projects/abc/file.pdf" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="mime_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MIME Type</FormLabel>
                <FormControl>
                  <Input placeholder="application/pdf" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="file_size_bytes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>File Size (bytes)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
          <Button type="submit" disabled={createFile.isPending}>
            {createFile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Register File
          </Button>
        </div>
      </form>
    </Form>
  );
}
