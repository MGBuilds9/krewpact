'use client';

import React, { useState, useCallback } from 'react';
import { Search, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

interface OrgUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImpersonationSelector({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const { startImpersonation } = useImpersonation();

  const { data, isLoading } = useQuery({
    queryKey: ['org-users-impersonate', search],
    queryFn: () =>
      apiFetch<{ data: OrgUser[]; total: number }>('/api/org/users', {
        params: { search: search || undefined, limit: '20' },
      }),
    enabled: open,
  });

  const handleSelect = useCallback(
    (user: OrgUser) => {
      startImpersonation(user.id);
      onOpenChange(false);
      setSearch('');
    },
    [startImpersonation, onOpenChange],
  );

  const users = data?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-600" />
            View As User
          </DialogTitle>
          <DialogDescription>
            Select a user to view the application as them. This is read-only simulation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading users...</div>
          )}
          {!isLoading && users.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No users found</div>
          )}
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url ?? ''} />
                <AvatarFallback className="text-xs">
                  {user.first_name[0]}
                  {user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              {user.status !== 'active' && (
                <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  {user.status}
                </span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
