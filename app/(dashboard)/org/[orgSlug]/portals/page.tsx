'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Users } from 'lucide-react';
import { usePortalAccounts } from '@/hooks/usePortals';
import { PortalInviteForm } from '@/components/Portals/PortalInviteForm';

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'invited':
      return 'bg-yellow-500';
    case 'suspended':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

export default function PortalsPage() {
  const { data, isLoading } = usePortalAccounts();
  const [open, setOpen] = useState(false);

  const accounts = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client & Partner Portals</h1>
          <p className="text-sm text-muted-foreground">
            Manage external portal access for clients and trade partners.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite Portal User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Portal User</DialogTitle>
            </DialogHeader>
            <PortalInviteForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No portal accounts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite your first client or trade partner.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">
                    {account.company_name ?? account.contact_name ?? account.email}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(account.status)}`} />
                    <span className="text-xs capitalize text-muted-foreground">
                      {account.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{account.email}</p>
                {account.phone && <p className="text-sm text-muted-foreground">{account.phone}</p>}
                <Badge variant="outline" className="mt-2 capitalize">
                  {account.actor_type.replace('_', ' ')}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
