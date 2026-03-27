'use client';

import { Button } from '@/components/ui/button';

interface StepSuccessProps {
  onBack: () => void;
  onComplete: () => void;
}

export function StepSuccess({ onBack, onComplete }: StepSuccessProps) {
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
