'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Building2 } from 'lucide-react';
import { useAccounts } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';

export default function AccountsPage() {
  const router = useRouter();
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');

  const { data: accounts, isLoading } = useAccounts({
    divisionId: activeDivision?.id,
    search: search || undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 animate-pulse" />
          <Skeleton className="h-10 w-36 animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const filteredAccounts = accounts ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => router.push('/crm/accounts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Account
        </Button>
      </div>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first account to organize your contacts and opportunities
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredAccounts.map((account) => (
            <Card
              key={account.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/crm/accounts/${account.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{account.account_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      {account.account_type && (
                        <span className="capitalize">{account.account_type}</span>
                      )}
                      <span>
                        {new Date(account.created_at).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
