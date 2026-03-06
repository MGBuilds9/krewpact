'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import SequenceDefaultsForm from '@/components/CRM/SequenceDefaultsForm';

export default function SequenceDefaultsPage() {
  const { push: orgPush } = useOrgRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => orgPush('/crm/settings')}>
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
            These defaults apply to all new sequences. Individual sequences can override
            these values in their own settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SequenceDefaultsForm />
        </CardContent>
      </Card>
    </div>
  );
}
