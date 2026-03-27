'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

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
import { Switch } from '@/components/ui/switch';
import { type Contact, useCreateContact, useUpdateContact } from '@/hooks/useCRM';
import {
  type ContactCreate,
  contactCreateSchema,
  type ContactUpdate,
  contactUpdateSchema,
} from '@/lib/validators/crm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormProp = any;

interface ContactFormProps {
  contact?: Contact;
  defaultAccountId?: string;
  defaultLeadId?: string;
  onSuccess?: (contact: Contact) => void;
  onCancel?: () => void;
}

function cleanValues(raw: ContactCreate | ContactUpdate): ContactCreate | ContactUpdate {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v])) as
    | ContactCreate
    | ContactUpdate;
}

function buildNames(contact?: Contact) {
  return {
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    is_primary: contact?.is_primary ?? false,
  };
}

function buildDefaultValues(contact?: Contact, defaultAccountId?: string, defaultLeadId?: string) {
  return {
    ...buildNames(contact),
    email: contact?.email ?? undefined,
    phone: contact?.phone ?? undefined,
    role_title: contact?.role_title ?? undefined,
    account_id: contact?.account_id ?? defaultAccountId ?? undefined,
    lead_id: contact?.lead_id ?? defaultLeadId ?? undefined,
  };
}

function ContactFormFields({
  form,
  isEdit,
  isPending,
  onCancel,
}: {
  form: FormProp;
  isEdit: boolean;
  isPending: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John" {...field} value={field.value ?? ''} />
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
              <FormLabel>Last Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Smith" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  {...field}
                  value={field.value ?? ''}
                />
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
                <Input placeholder="(416) 555-0100" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="role_title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role / Title</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Project Manager" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="is_primary"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormControl>
              <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">Primary Contact</FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Contact'}
        </Button>
      </div>
    </>
  );
}

export function ContactForm({
  contact,
  defaultAccountId,
  defaultLeadId,
  onSuccess,
  onCancel,
}: ContactFormProps) {
  const isEdit = !!contact;
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const isPending = createContact.isPending || updateContact.isPending;
  const form = useForm<ContactCreate | ContactUpdate>({
    resolver: zodResolver(isEdit ? contactUpdateSchema : contactCreateSchema),
    defaultValues: buildDefaultValues(contact, defaultAccountId, defaultLeadId),
  });

  function onSubmit(raw: ContactCreate | ContactUpdate) {
    const values = cleanValues(raw);
    const cb = { onSuccess: (data: unknown) => onSuccess?.(data as Contact) };
    if (isEdit && contact) {
      updateContact.mutate({ id: contact.id, ...values }, cb);
    } else {
      createContact.mutate(values as ContactCreate, cb);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ContactFormFields form={form} isEdit={isEdit} isPending={isPending} onCancel={onCancel} />
      </form>
    </Form>
  );
}
