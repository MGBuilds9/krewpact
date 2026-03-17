'use client';

import { ArrowLeft, Zap } from 'lucide-react';

import SequenceDefaultsForm from '@/components/CRM/SequenceDefaultsForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrgRouter } from '@/hooks/useOrgRouter';

export default function SequenceDefaultsPage() {
  const { push: orgPush } = useOrgRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/settings')}
          aria-label="Back to CRM settings"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Zap className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sequence Defaults</h2>
          <p className="text-muted-foreground">
            Configure global defaults for outreach sequence enrollment and sending behavior.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sending Configuration</CardTitle>
          <CardDescription>
            These defaults apply to all new sequences. Individual sequences can override these
            values in their own settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SequenceDefaultsForm />
        </CardContent>
      </Card>
    </div>
  );
}
