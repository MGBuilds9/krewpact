'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Shield } from 'lucide-react';
import { usePortalAccounts } from '@/hooks/usePortals';
import { PortalPermissionForm } from '@/components/Portals/PortalPermissionForm';
import { PortalMessageForm } from '@/components/Portals/PortalMessageForm';

export default function PortalManagePage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'permissions' | 'message' | null>(null);

  const { data } = usePortalAccounts();
  const accounts = (data?.data ?? []).filter(
    (a) =>
      !search ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.company_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

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
          <Card key={account.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">
                  {account.company_name ?? account.contact_name ?? account.email}
                </p>
                <p className="text-sm text-muted-foreground">{account.email}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog(account.id, 'permissions')}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Permissions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog(account.id, 'message')}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!mode}
        onOpenChange={(o) => {
          if (!o) {
            setMode(null);
            setSelectedId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'permissions' ? 'Edit Permissions' : 'Send Message'}
            </DialogTitle>
          </DialogHeader>
          {mode === 'permissions' && selectedId && (
            <PortalPermissionForm
              portalAccountId={selectedId}
              onSuccess={() => {
                setMode(null);
                setSelectedId(null);
              }}
              onCancel={() => {
                setMode(null);
                setSelectedId(null);
              }}
            />
          )}
          {mode === 'message' && selectedId && (
            <PortalMessageForm
              portalAccountId={selectedId}
              onSuccess={() => {
                setMode(null);
                setSelectedId(null);
              }}
              onCancel={() => {
                setMode(null);
                setSelectedId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
