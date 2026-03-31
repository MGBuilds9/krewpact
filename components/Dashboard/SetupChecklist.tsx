'use client';

import { CheckCircle2, Circle, Rocket, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useSetupProgress } from '@/hooks/useSetupProgress';
import { useOrg } from '@/contexts/OrgContext';
import { cn } from '@/lib/utils';

export function SetupChecklist() {
  const { steps, completed, total, isDismissed } = useSetupProgress();
  const { push: orgPush } = useOrgRouter();
  const { orgSlug } = useOrg();
  const [dismissing, setDismissing] = useState(false);
  const [hidden, setHidden] = useState(false);

  const handleDismiss = useCallback(async () => {
    setDismissing(true);
    try {
      await fetch(`/api/org/${orgSlug}/dismiss-checklist`, { method: 'POST' });
      setHidden(true);
    } catch {
      setDismissing(false);
    }
  }, [orgSlug]);

  if (isDismissed || hidden || !total) return null;
  if (completed === total) return null;

  const progressPercent = Math.round((completed / total) * 100);

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm">Get started with KrewPact</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground"
            onClick={handleDismiss}
            disabled={dismissing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{completed} of {total} complete</span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="space-y-1.5">
          {steps.map((step) => (
            <button
              key={step.key}
              onClick={() => orgPush(step.href)}
              className={cn(
                'flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                step.completed
                  ? 'text-muted-foreground'
                  : 'text-foreground hover:bg-blue-100/50 dark:hover:bg-blue-900/20',
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div>
                <span className={cn(step.completed && 'line-through')}>{step.label}</span>
                {!step.completed && (
                  <span className="text-xs text-muted-foreground ml-2">{step.description}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
