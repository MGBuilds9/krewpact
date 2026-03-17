'use client';

import { MessageSquare, Shield } from 'lucide-react';
import { useState } from 'react';

import { PortalMessageForm } from '@/components/Portals/PortalMessageForm';
import { PortalPermissionForm } from '@/components/Portals/PortalPermissionForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePortalAccounts } from '@/hooks/usePortals';

type DialogMode = 'permissions' | 'message' | null;
type Account = {
  id: string;
  email: string;
  company_name?: string | null;
  contact_name?: string | null;
};

function AccountCard({
  account,
  onOpen,
}: {
  account: Account;
  onOpen: (id: string, m: 'permissions' | 'message') => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="font-medium">
            {account.company_name || account.contact_name || account.email}
          </p>
          <p className="text-sm text-muted-foreground">{account.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpen(account.id, 'permissions')}>
            <Shield className="mr-2 h-4 w-4" />
            Permissions
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpen(account.id, 'message')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function closeHandler(
  setMode: (m: DialogMode) => void,
  setSelectedId: (id: string | null) => void,
) {
  return () => {
    setMode(null);
    setSelectedId(null);
  };
}

export default function PortalManagePage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<DialogMode>(null);

  const { data } = usePortalAccounts();
  const rawAccounts = data ? data.data || [] : [];
  const accounts = rawAccounts.filter(
    (a) =>
      !search ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.company_name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const close = closeHandler(setMode, setSelectedId);

  function openDialog(id: string, m: 'permissions' | 'message') {
    setSelectedId(id);
    setMode(m);
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Manage Portals</h1>
        <p className="text-sm text-muted-foreground">
          Configure permissions and send messages to portal users.
        </p>
      </div>
      <Input
        placeholder="Search portal accounts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="space-y-3">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account as Account} onOpen={openDialog} />
        ))}
      </div>
      <Dialog
        open={!!mode}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'permissions' ? 'Edit Permissions' : 'Send Message'}
            </DialogTitle>
          </DialogHeader>
          {mode === 'permissions' && selectedId && (
            <PortalPermissionForm portalAccountId={selectedId} onSuccess={close} onCancel={close} />
          )}
          {mode === 'message' && selectedId && (
            <PortalMessageForm portalAccountId={selectedId} onSuccess={close} onCancel={close} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
