'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  companyProfileSchema,
  divisionSelectionSchema,
  teamInviteSchema,
  DIVISION_CODES,
  type CompanyProfile,
  type DivisionSelection,
  type DivisionCode,
} from '@/lib/validators/org';
import { showToast } from '@/lib/toast';

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

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Step 1: Company profile form
  const companyForm = useForm<CompanyProfile>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: { name: '', address: '', phone: '' },
  });

  // Step 2: Division selection
  const divisionForm = useForm<DivisionSelection>({
    resolver: zodResolver(divisionSelectionSchema),
    defaultValues: { divisions: [] },
  });

  // Step 3: Team invite form (for adding individual invites)
  const inviteForm = useForm<{ email: string; role: string }>({
    resolver: zodResolver(teamInviteSchema),
    defaultValues: { email: '', role: '' },
  });

  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  const handleNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSkip = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const handleCompanySubmit = companyForm.handleSubmit(() => {
    showToast.success('Company profile saved');
    handleNext();
  });

  const handleDivisionSubmit = divisionForm.handleSubmit(() => {
    showToast.success('Divisions configured');
    handleNext();
  });

  const handleAddInvite = inviteForm.handleSubmit((data) => {
    if (pendingInvites.some((inv) => inv.email === data.email)) {
      showToast.error('This email has already been added');
      return;
    }
    setPendingInvites((prev) => [...prev, { email: data.email, role: data.role }]);
    inviteForm.reset();
    showToast.success(`Invite added for ${data.email}`);
  });

  const handleRemoveInvite = (email: string) => {
    setPendingInvites((prev) => prev.filter((inv) => inv.email !== email));
  };

  const handleFinishInvites = () => {
    handleNext();
  };

  const handleComplete = () => {
    showToast.success('Onboarding complete!');
    onComplete?.();
  };

  const handleDivisionToggle = (code: DivisionCode, checked: boolean) => {
    const current = divisionForm.getValues('divisions');
    if (checked) {
      divisionForm.setValue('divisions', [...current, code], { shouldValidate: true });
    } else {
      divisionForm.setValue(
        'divisions',
        current.filter((d) => d !== code),
        { shouldValidate: true },
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {currentStep} of {TOTAL_STEPS}
          </span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Onboarding progress: step ${currentStep} of ${TOTAL_STEPS}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step 1: Company Profile */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Company Profile</h2>
          <p className="text-muted-foreground">Tell us about your company to get started.</p>
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                placeholder="MDM Group Inc."
                {...companyForm.register('name')}
              />
              {companyForm.formState.errors.name && (
                <p className="text-sm text-destructive" role="alert">
                  {companyForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-address">Address</Label>
              <Input
                id="company-address"
                placeholder="123 Main St, Mississauga, ON"
                {...companyForm.register('address')}
              />
              {companyForm.formState.errors.address && (
                <p className="text-sm text-destructive" role="alert">
                  {companyForm.formState.errors.address.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <Input
                id="company-phone"
                placeholder="905-555-0100"
                {...companyForm.register('phone')}
              />
              {companyForm.formState.errors.phone && (
                <p className="text-sm text-destructive" role="alert">
                  {companyForm.formState.errors.phone.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Division Setup */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Division Setup</h2>
          <p className="text-muted-foreground">Select the divisions your company operates in.</p>
          <form onSubmit={handleDivisionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DIVISION_CODES.map((code) => (
                <label
                  key={code}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent"
                >
                  <Checkbox
                    checked={divisionForm.watch('divisions').includes(code)}
                    onCheckedChange={(checked) => handleDivisionToggle(code, checked === true)}
                  />
                  <span className="text-sm font-medium">{DIVISION_LABELS[code]}</span>
                </label>
              ))}
            </div>
            {divisionForm.formState.errors.divisions && (
              <p className="text-sm text-destructive" role="alert">
                {divisionForm.formState.errors.divisions.message}
              </p>
            )}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
                <Button type="submit">Next</Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Invite Team */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Invite Team Members</h2>
          <p className="text-muted-foreground">
            Add your team members. You can always invite more later.
          </p>
          <form onSubmit={handleAddInvite} className="space-y-4">
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
                  onValueChange={(val) =>
                    inviteForm.setValue('role', val, { shouldValidate: true })
                  }
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

          {/* Pending invites list */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Pending Invites</h3>
              <ul className="space-y-2" data-testid="pending-invites">
                {pendingInvites.map((inv) => (
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInvite(inv.email)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
              <Button type="button" onClick={handleFinishInvites}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 4 && (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
            <p className="text-muted-foreground">
              Your workspace is ready. Start exploring KrewPact.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <a
              href="/crm/leads"
              className="rounded-lg border p-4 text-center transition-colors hover:bg-accent"
            >
              <div className="font-medium">CRM</div>
              <div className="text-sm text-muted-foreground">Manage leads</div>
            </a>
            <a
              href="/estimates"
              className="rounded-lg border p-4 text-center transition-colors hover:bg-accent"
            >
              <div className="font-medium">Estimates</div>
              <div className="text-sm text-muted-foreground">Create estimates</div>
            </a>
            <a
              href="/projects"
              className="rounded-lg border p-4 text-center transition-colors hover:bg-accent"
            >
              <div className="font-medium">Projects</div>
              <div className="text-sm text-muted-foreground">Track projects</div>
            </a>
          </div>
          <div className="flex justify-center gap-2">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleComplete}>Get Started</Button>
          </div>
        </div>
      )}
    </div>
  );
}
