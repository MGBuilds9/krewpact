'use client';

import { useRouter } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AccountForm } from '@/components/CRM/AccountForm';
import type { Account } from '@/hooks/useCRM';

export default function NewAccountPage() {
  const router = useRouter();
  const { push: orgPush } = useOrgRouter();

  function handleSuccess(account: Account) {
    orgPush(`/crm/accounts/${account.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/accounts')}
          aria-label="Back to accounts"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Account</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm onSuccess={handleSuccess} onCancel={() => router.back()} />
        </CardContent>
      </Card>
    </div>
  );
}
