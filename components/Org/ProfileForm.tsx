'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { apiFetch } from '@/lib/api-client';
import { profileUpdateSchema } from '@/lib/validators/org';

type FormValues = z.infer<typeof profileUpdateSchema>;

interface ProfileFormProps {
  defaultValues?: Partial<FormValues>;
  onSuccess?: () => void;
}

export function ProfileForm({ defaultValues, onSuccess }: ProfileFormProps) {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: (data: FormValues) =>
      apiFetch('/api/user/profile', { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile updated');
      onSuccess?.();
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: defaultValues ?? {},
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => updateProfile.mutate(v))} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 (416) 555-0100" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </form>
    </Form>
  );
}
