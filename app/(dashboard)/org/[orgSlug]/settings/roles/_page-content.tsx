'use client';

import { ChevronRight, Shield } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRolePermissions, useRoles } from '@/hooks/useOrg';

function RoleDetail({ roleId, roleName }: { roleId: string; roleName: string }) {
  const { data: permissions, isLoading } = useRolePermissions(roleId);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{roleName} — Permissions</h3>
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !permissions?.length ? (
        <p className="text-sm text-muted-foreground">No permissions assigned.</p>
      ) : (
        <div className="space-y-1">
          {permissions.map((rp) => (
            <div
              key={rp.id}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
            >
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span>{rp.permission_key}</span>
              <Badge variant="default" className="ml-auto text-xs">
                Granted
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  const { data, isLoading } = useRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');

  const roles = data?.data ?? [];

  return (
    <div className="flex h-full gap-6 p-6">
      <div className="w-72 space-y-4">
        <h1 className="text-2xl font-bold">Roles</h1>
        {isLoading ? (
          <div className="space-y-2">
            {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((id) => (
              <Skeleton key={id} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => {
                  setSelectedRoleId(role.id);
                  setSelectedRoleName(role.role_name);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-muted ${selectedRoleId === role.id ? 'bg-muted font-medium' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {role.role_name}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        {selectedRoleId ? (
          <Card>
            <CardContent className="pt-6">
              <RoleDetail roleId={selectedRoleId} roleName={selectedRoleName} />
            </CardContent>
          </Card>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a role to view permissions
          </div>
        )}
      </div>
    </div>
  );
}
