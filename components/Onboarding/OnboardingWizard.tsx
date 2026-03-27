'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/lib/toast';
import {
  type CompanyProfile,
  companyProfileSchema,
  DIVISION_CODES,
  type DivisionCode,
  type DivisionSelection,
  divisionSelectionSchema,
  teamInviteSchema,
} from '@/lib/validators/org';

const TOTAL_STEPS = 4;

const DIVISION_LABELS: Record<DivisionCode, string> = {
  contracting: 'MDM Contracting',
  homes: 'MDM Homes',
  wood: 'MDM Wood',
  telecom: 'MDM Telecom',
  'group-inc': 'MDM Group Inc.',
  management: 'MDM Management',
};

const INTERNAL_ROLES = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'executive', label: 'Executive' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'project_coordinator', label: 'Project Coordinator' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'field_supervisor', label: 'Field Supervisor' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'payroll_admin', label: 'Payroll Admin' },
];

interface PendingInvite {
  email: string;
  role: string;
}

interface OnboardingWizardProps {
  onComplete?: () => void;
}

function StepCompanyProfile({
  form,
  onSkip,
  onSubmit,
}: {
  form: UseFormReturn<CompanyProfile>;
  onSkip: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
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

function StepDivisionSetup({
  form,
  onBack,
  onSkip,
  onSubmit,
  onToggle,
}: {
  form: UseFormReturn<DivisionSelection>;
  onBack: () => void;
  onSkip: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggle: (code: DivisionCode, checked: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Division Setup</h2>
      <p className="text-muted-foreground">Select the divisions your company operates in.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DIVISION_CODES.map((code) => (
            <label
              key={code}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent"
            >
              <Checkbox
                checked={form.watch('divisions').includes(code)}
                onCheckedChange={(checked) => onToggle(code, checked === true)}
              />
              <span className="text-sm font-medium">{DIVISION_LABELS[code]}</span>
            </label>
          ))}
        </div>
        {form.formState.errors.divisions && (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.divisions.message}
          </p>
        )}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

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

function StepInviteTeam({
  inviteForm,
  pendingInvites,
  onBack,
  onSkip,
  onNext,
  onAddInvite,
  onRemove,
}: {
  inviteForm: InviteForm;
  pendingInvites: PendingInvite[];
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  onAddInvite: (e: React.FormEvent) => void;
  onRemove: (email: string) => void;
}) {
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

function WizardProgress({
  currentStep,
  totalSteps,
  progressPercent,
}: {
  currentStep: number;
  totalSteps: number;
  progressPercent: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {currentStep} of {totalSteps}
        </span>
        <span>{Math.round(progressPercent)}% complete</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

function StepSuccess({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
        <p className="text-muted-foreground">Your workspace is ready. Start exploring KrewPact.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { href: '/crm/leads', label: 'CRM', sub: 'Manage leads' },
          { href: '/estimates', label: 'Estimates', sub: 'Create estimates' },
          { href: '/projects', label: 'Projects', sub: 'Track projects' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-lg border p-4 text-center transition-colors hover:bg-accent"
          >
            <div className="font-medium">{item.label}</div>
            <div className="text-sm text-muted-foreground">{item.sub}</div>
          </a>
        ))}
      </div>
      <div className="flex justify-center gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onComplete}>Get Started</Button>
      </div>
    </div>
  );
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  const companyForm = useForm<CompanyProfile>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });
  const divisionForm = useForm<DivisionSelection>({
    resolver: zodResolver(divisionSelectionSchema),
    defaultValues: { divisions: [] },
  });
  const inviteForm = useForm<{ email: string; role: string }>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: { email: '', role: '' },
  });

  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  const handleNext = useCallback(() => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS)), []);
  const handleBack = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 1)), []);

  const handleDivisionToggle = (code: DivisionCode, checked: boolean) => {
    const current = divisionForm.getValues('divisions');
    divisionForm.setValue(
      'divisions',
      checked ? [...current, code] : current.filter((d) => d !== code),
      { shouldValidate: true },
    );
  };

  const handleAddInvite = inviteForm.handleSubmit((data) => {
    if (pendingInvites.some((inv) => inv.email === data.email)) {
      showToast.error('This email has already been added');
      return;
    }
    setPendingInvites((prev) => [...prev, { email: data.email, role: data.role }]);
    inviteForm.reset();
    showToast.success(`Invite added for ${data.email}`);
  });

  const handleComplete = () => {
    showToast.success('Onboarding complete!');
    onComplete?.();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <WizardProgress
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        progressPercent={progressPercent}
      />
      {currentStep === 1 && (
        <StepCompanyProfile
          form={companyForm}
          onSkip={handleNext}
          onSubmit={companyForm.handleSubmit(() => {
            showToast.success('Company profile saved');
            handleNext();
          })}
        />
      )}
      {currentStep === 2 && (
        <StepDivisionSetup
          form={divisionForm}
          onBack={handleBack}
          onSkip={handleNext}
          onSubmit={divisionForm.handleSubmit(() => {
            showToast.success('Divisions configured');
            handleNext();
          })}
          onToggle={handleDivisionToggle}
        />
      )}
      {currentStep === 3 && (
        <StepInviteTeam
          inviteForm={inviteForm}
          pendingInvites={pendingInvites}
          onBack={handleBack}
          onSkip={handleNext}
          onNext={handleNext}
          onAddInvite={handleAddInvite}
          onRemove={(email) =>
            setPendingInvites((prev) => prev.filter((inv) => inv.email !== email))
          }
        />
      )}
      {currentStep === 4 && <StepSuccess onBack={handleBack} onComplete={handleComplete} />}
    </div>
  );
}
