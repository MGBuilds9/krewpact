'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { useCreatePhoto } from '@/hooks/useDocuments';
import { photoAssetCreateSchema } from '@/lib/validators/documents';

type FormValues = z.infer<typeof photoAssetCreateSchema>;

const PHOTO_CATEGORIES = [
  'progress',
  'deficiency',
  'safety',
  'site_condition',
  'completion',
  'other',
] as const;

interface PhotoCaptureFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function PhotoCaptureForm({ projectId, onSuccess, onCancel }: PhotoCaptureFormProps) {
  const createPhoto = useCreatePhoto(projectId);
  const form = useForm<FormValues>({
    resolver: zodResolver(photoAssetCreateSchema),
    defaultValues: {
      file_id: '',
      taken_at: new Date().toISOString().slice(0, 16),
      category: 'progress',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createPhoto.mutateAsync(values as Parameters<typeof createPhoto.mutateAsync>[0]);
      toast.success('Photo added');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to add photo');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="file_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File ID</FormLabel>
              <FormControl>
                <Input placeholder="UUID of uploaded file" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PHOTO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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
          name="taken_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Taken At</FormLabel>
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
          <Button type="submit" disabled={createPhoto.isPending}>
            {createPhoto.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Photo
          </Button>
        </div>
      </form>
    </Form>
  );
}
