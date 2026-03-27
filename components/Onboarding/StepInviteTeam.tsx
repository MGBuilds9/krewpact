'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { INTERNAL_ROLES, type PendingInvite } from './onboarding-constants';

type InviteForm = UseFormReturn<{ email: string; role: string }>;

function PendingInviteList({
  invites,
  onRemove,
}: {
  invites: PendingInvite[];
  onRemove: (email: string) => void;
}) {
  if (invites.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Pending Invites</h3>
      <ul className="space-y-2" data-testid="pending-invites">
        {invites.map((inv) => (
          <li
            key={inv.email}
            className="flex items-center justify-between rounded-md border p-2 text-sm"
          >
            <span>
              {inv.email}{' '}
              <span className="text-muted-foreground">
                ({INTERNAL_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role})
              </span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(inv.email)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InviteFormFields({
  inviteForm,
  onAddInvite,
}: {
  inviteForm: InviteForm;
  onAddInvite: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onAddInvite} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@company.com"
            {...inviteForm.register('email')}
          />
          {inviteForm.formState.errors.email && (
            <p className="text-sm text-destructive" role="alert">
              {inviteForm.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select
            onValueChange={(val) => inviteForm.setValue('role', val, { shouldValidate: true })}
            value={inviteForm.watch('role')}
          >
            <SelectTrigger id="invite-role">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {INTERNAL_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {inviteForm.formState.errors.role && (
            <p className="text-sm text-destructive" role="alert">
              {inviteForm.formState.errors.role.message}
            </p>
          )}
        </div>
      </div>
      <Button type="submit" variant="secondary" size="sm">
        Add Invite
      </Button>
    </form>
  );
}

interface StepInviteTeamProps {
  inviteForm: InviteForm;
  pendingInvites: PendingInvite[];
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  onAddInvite: (e: React.FormEvent) => void;
  onRemove: (email: string) => void;
}

export function StepInviteTeam({
  inviteForm,
  pendingInvites,
  onBack,
  onSkip,
  onNext,
  onAddInvite,
  onRemove,
}: StepInviteTeamProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Invite Team Members</h2>
      <p className="text-muted-foreground">
        Add your team members. You can always invite more later.
      </p>
      <InviteFormFields inviteForm={inviteForm} onAddInvite={onAddInvite} />
      <PendingInviteList invites={pendingInvites} onRemove={onRemove} />
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button type="button" onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
