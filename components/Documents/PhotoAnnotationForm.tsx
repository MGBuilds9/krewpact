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
import { Textarea } from '@/components/ui/textarea';
import { useCreatePhotoAnnotation } from '@/hooks/useDocuments';

const formSchema = z.object({
  note: z.string().min(1, 'Annotation note is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface PhotoAnnotationFormProps {
  projectId: string;
  photoId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PhotoAnnotationForm({
  projectId,
  photoId,
  onSuccess,
  onCancel,
}: PhotoAnnotationFormProps) {
  const createAnnotation = useCreatePhotoAnnotation(projectId, photoId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { note: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createAnnotation.mutateAsync({
        annotation_json: { note: values.note, created: new Date().toISOString() },
      } as Parameters<typeof createAnnotation.mutateAsync>[0]);
      toast.success('Annotation added');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to add annotation');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Annotation Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what you see or the issue to flag..."
                  rows={3}
                  {...field}
                />
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
          <Button type="submit" disabled={createAnnotation.isPending}>
            {createAnnotation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Annotation
          </Button>
        </div>
      </form>
    </Form>
  );
}
