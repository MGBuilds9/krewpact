// eslint-disable-next-line simple-import-sort/imports
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock showToast
vi.mock('@/lib/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    undo: vi.fn(),
  },
}));

// Mock Select components (Radix portals don't work in jsdom)
let _selectOnValueChange: ((v: string) => void) | undefined;
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value: _value,
  }: {
    children: React.ReactNode;
    onValueChange: (v: string) => void;
    value?: string;
  }) => {
    _selectOnValueChange = onValueChange;
    return <div data-testid="select-root">{children}</div>;
  },
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <button data-testid="select-trigger" id={id}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

import { OnboardingWizard } from '@/components/Onboarding/OnboardingWizard';
import { showToast } from '@/lib/toast';

const mockShowToast = vi.mocked(showToast);

describe('OnboardingWizard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    _selectOnValueChange = undefined;
  });

  // ─── Step Indicator ───
  describe('step indicator', () => {
    it('shows Step 1 of 4 on initial render', () => {
      render(<OnboardingWizard />);
      expect(screen.getByText('Step 1 of 4')).toBeDefined();
    });

    it('shows progress bar with 0% at step 1', () => {
      render(<OnboardingWizard />);
      expect(screen.getByText('0% complete')).toBeDefined();
    });

    it('has accessible progressbar role', () => {
      render(<OnboardingWizard />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeDefined();
      expect(progressbar.getAttribute('aria-valuenow')).toBe('0');
    });
  });

  // ─── Step 1: Company Profile ───
  describe('Step 1: Company Profile', () => {
    it('renders company profile form', () => {
      render(<OnboardingWizard />);
      expect(screen.getByText('Company Profile')).toBeDefined();
      expect(screen.getByLabelText('Company Name')).toBeDefined();
      expect(screen.getByLabelText('Address')).toBeDefined();
      expect(screen.getByLabelText('Phone')).toBeDefined();
    });

    it('shows validation errors for empty fields on submit', async () => {
      render(<OnboardingWizard />);
      await user.click(screen.getByRole('button', { name: 'Next' }));
      // Zod errors should appear
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });

    it('advances to step 2 on valid submit', async () => {
      render(<OnboardingWizard />);
      await user.type(screen.getByLabelText('Company Name'), 'MDM Group Inc.');
      await user.type(screen.getByLabelText('Address'), '123 Main St, Mississauga');
      await user.type(screen.getByLabelText('Phone'), '905-555-0100');
      await user.click(screen.getByRole('button', { name: 'Next' }));

      expect(mockShowToast.success).toHaveBeenCalledWith('Company profile saved');
      expect(screen.getByText('Step 2 of 4')).toBeDefined();
      expect(screen.getByText('Division Setup')).toBeDefined();
    });

    it('skip button advances to step 2 without validation', async () => {
      render(<OnboardingWizard />);
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByText('Step 2 of 4')).toBeDefined();
    });
  });

  // ─── Step 2: Division Setup ───
  describe('Step 2: Division Setup', () => {
    async function goToStep2() {
      render(<OnboardingWizard />);
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    }

    it('renders all 6 division checkboxes', async () => {
      await goToStep2();
      expect(screen.getByText('MDM Contracting')).toBeDefined();
      expect(screen.getByText('MDM Homes')).toBeDefined();
      expect(screen.getByText('MDM Wood')).toBeDefined();
      expect(screen.getByText('MDM Telecom')).toBeDefined();
      expect(screen.getByText('MDM Group Inc.')).toBeDefined();
      expect(screen.getByText('MDM Management')).toBeDefined();
    });

    it('back button returns to step 1', async () => {
      await goToStep2();
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Step 1 of 4')).toBeDefined();
    });

    it('skip button advances to step 3', async () => {
      await goToStep2();
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByText('Step 3 of 4')).toBeDefined();
    });

    it('shows progress at 33% on step 2', async () => {
      await goToStep2();
      expect(screen.getByText('33% complete')).toBeDefined();
    });
  });

  // ─── Step 3: Team Invites ───
  describe('Step 3: Invite Team', () => {
    async function goToStep3() {
      render(<OnboardingWizard />);
      // Skip step 1
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      // Skip step 2
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    }

    it('renders invite form with email input and role select', async () => {
      await goToStep3();
      expect(screen.getByText('Invite Team Members')).toBeDefined();
      expect(screen.getByLabelText('Email')).toBeDefined();
      expect(screen.getByText('Select role')).toBeDefined();
    });

    it('back button returns to step 2', async () => {
      await goToStep3();
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Step 2 of 4')).toBeDefined();
    });

    it('skip button advances to step 4', async () => {
      await goToStep3();
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByText('Step 4 of 4')).toBeDefined();
    });

    it('does not add invite with invalid email', async () => {
      await goToStep3();
      await user.type(screen.getByLabelText('Email'), 'not-an-email');
      await user.click(screen.getByText('Add Invite'));
      // Invalid email should not be added to pending invites
      expect(screen.queryByTestId('pending-invites')).toBeNull();
    });

    it('shows progress at 67% on step 3', async () => {
      await goToStep3();
      expect(screen.getByText('67% complete')).toBeDefined();
    });

    it('next button advances to step 4', async () => {
      await goToStep3();
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText('Step 4 of 4')).toBeDefined();
    });
  });

  // ─── Step 4: Success ───
  describe('Step 4: Success', () => {
    async function goToStep4() {
      render(<OnboardingWizard />);
      // Skip steps 1, 2, 3
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    }

    it('shows success heading', async () => {
      await goToStep4();
      expect(screen.getByText("You're all set!")).toBeDefined();
    });

    it('shows links to CRM, Estimates, and Projects', async () => {
      await goToStep4();
      const crmLink = screen.getByText('CRM').closest('a');
      expect(crmLink?.getAttribute('href')).toBe('/crm/leads');
      const estimatesLink = screen.getByText('Estimates').closest('a');
      expect(estimatesLink?.getAttribute('href')).toBe('/estimates');
      const projectsLink = screen.getByText('Projects').closest('a');
      expect(projectsLink?.getAttribute('href')).toBe('/projects');
    });

    it('shows progress at 100% on step 4', async () => {
      await goToStep4();
      expect(screen.getByText('100% complete')).toBeDefined();
    });

    it('calls onComplete when Get Started is clicked', async () => {
      const onComplete = vi.fn();
      render(<OnboardingWizard onComplete={onComplete} />);
      // Skip to step 4
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      await user.click(screen.getByRole('button', { name: 'Skip' }));
      await user.click(screen.getByRole('button', { name: 'Get Started' }));
      expect(mockShowToast.success).toHaveBeenCalledWith('Onboarding complete!');
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('back button returns to step 3', async () => {
      await goToStep4();
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Step 3 of 4')).toBeDefined();
    });
  });

  // ─── Full Navigation Flow ───
  describe('full navigation flow', () => {
    it('navigates through all steps and back', async () => {
      render(<OnboardingWizard />);

      // Step 1 → Skip → Step 2
      expect(screen.getByText('Step 1 of 4')).toBeDefined();
      await user.click(screen.getByRole('button', { name: 'Skip' }));

      // Step 2 → Skip → Step 3
      expect(screen.getByText('Step 2 of 4')).toBeDefined();
      await user.click(screen.getByRole('button', { name: 'Skip' }));

      // Step 3 → Skip → Step 4
      expect(screen.getByText('Step 3 of 4')).toBeDefined();
      await user.click(screen.getByRole('button', { name: 'Skip' }));

      // Step 4
      expect(screen.getByText('Step 4 of 4')).toBeDefined();

      // Back → Step 3
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Step 3 of 4')).toBeDefined();

      // Back → Step 2
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Step 2 of 4')).toBeDefined();

      // Back → Step 1
      await user.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Step 1 of 4')).toBeDefined();
    });
  });
});
