'use client';

import { Plus, Settings, User } from 'lucide-react';
import { useState } from 'react';

import { UserProvisioningForm } from '@/components/Org/UserProvisioningForm';
import { UserRoleEditor } from '@/components/Org/UserRoleEditor';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOrgUsers } from '@/hooks/useOrg';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string } | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useOrgUsers({ search: debouncedSearch || undefined });
  const users = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Users"
        description="Manage internal team members and their access."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Provision User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Provision New User</DialogTitle>
              </DialogHeader>
              <UserProvisioningForm
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <Input
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-3">
          {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((id) => (
            <Skeleton key={id} className="h-16 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<User className="h-8 w-8" />}
          title={search ? 'No users found' : 'No users provisioned yet'}
          description={search ? undefined : 'Add your first team member to get started.'}
        />
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingUser({
                      id: user.id,
                      name: `${user.first_name} ${user.last_name}`.trim(),
                    })
                  }
                >
                  <Settings className="mr-2 h-3 w-3" />
                  Manage Roles
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingUser && (
        <UserRoleEditor
          userId={editingUser.id}
          userName={editingUser.name}
          open={!!editingUser}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}
