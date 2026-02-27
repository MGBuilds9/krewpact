'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const receiptFormSchema = z.object({
  file_id: z.string().uuid('A valid file ID is required'),
});

type FormValues = z.infer<typeof receiptFormSchema>;

interface ExpenseReceiptUploadFormProps {
  onSubmit: (values: { file_id: string }) => void;
  isLoading?: boolean;
}

export function ExpenseReceiptUploadForm({ onSubmit, isLoading }: ExpenseReceiptUploadFormProps) {
  const [fileName, setFileName] = useState<string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: { file_id: '' },
  });

  // In production this would upload to Supabase Storage and return a file_id.
  // For now accept a UUID manually (wired to the storage upload flow in Phase 2).
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <FormLabel>Receipt File</FormLabel>
          <Input
            type="file"
            accept="image/*,application/pdf"
            disabled
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          />
          <p className="text-xs text-muted-foreground">
            File upload wired to Supabase Storage in Phase 2. Supply a file_id directly for now.
          </p>
        </div>

        <FormField
          control={form.control}
          name="file_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File ID (UUID)</FormLabel>
              <FormControl>
                <Input placeholder="Supabase Storage file UUID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Attaching...' : 'Attach Receipt'}
        </Button>
      </form>
    </Form>
  );
}
