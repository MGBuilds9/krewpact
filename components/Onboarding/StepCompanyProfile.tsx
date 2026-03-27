'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CompanyProfile } from '@/lib/validators/org';

interface StepCompanyProfileProps {
  form: UseFormReturn<CompanyProfile>;
  onSkip: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StepCompanyProfile({ form, onSkip, onSubmit }: StepCompanyProfileProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Company Profile</h2>
      <p className="text-muted-foreground">Tell us about your company to get started.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input id="company-name" placeholder="MDM Group Inc." {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.name?.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="company-address">Address</Label>
          <Input
            id="company-address"
            placeholder="123 Main St, Mississauga, ON"
            {...form.register('address')}
          />
          {form.formState.errors.address && (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.address?.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="company-phone">Phone</Label>
          <Input id="company-phone" placeholder="905-555-0100" {...form.register('phone')} />
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.phone?.message}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button type="submit">Next</Button>
        </div>
      </form>
    </div>
  );
}
