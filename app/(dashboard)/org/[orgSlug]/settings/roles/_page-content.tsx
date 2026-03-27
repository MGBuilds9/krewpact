'use client';

import { ChevronRight, Shield } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useRolePermissions, useRoles } from '@/hooks/useOrg';

const CANONICAL_ROLES = [
  { key: 'platform_admin', label: 'Platform Admin', group: 'Internal' },
  { key: 'executive', label: 'Executive', group: 'Internal' },
  { key: 'operations_manager', label: 'Operations Manager', group: 'Internal' },
  { key: 'project_manager', label: 'Project Manager', group: 'Internal' },
  { key: 'project_coordinator', label: 'Project Coordinator', group: 'Internal' },
  { key: 'estimator', label: 'Estimator', group: 'Internal' },
  { key: 'field_supervisor', label: 'Field Supervisor', group: 'Internal' },
  { key: 'accounting', label: 'Accounting', group: 'Internal' },
  { key: 'payroll_admin', label: 'Payroll Admin', group: 'Internal' },
  { key: 'client_owner', label: 'Client Owner', group: 'External' },
  { key: 'client_delegate', label: 'Client Delegate', group: 'External' },
  { key: 'trade_partner_admin', label: 'Trade Partner Admin', group: 'External' },
  { key: 'trade_partner_user', label: 'Trade Partner User', group: 'External' },
] as const;

type RoleKey = (typeof CANONICAL_ROLES)[number]['key'];

interface AssignRoleDialogProps {
  open: boolean;
  onClose: () => void;
}

function AssignRoleDialog({ open, onClose }: AssignRoleDialogProps) {
  const [userId, setUserId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<RoleKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  function toggleRole(key: RoleKey) {
    setSelectedRoles((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key],
    );
  }

  async function handleSave() {
    if (!userId.trim()) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId.trim(), role_keys: selectedRoles }),
      });
      setResult(res.ok ? 'success' : 'error');
      if (res.ok) {
        setTimeout(() => {
          onClose();
          setUserId('');
          setSelectedRoles([]);
          setResult(null);
        }, 1200);
      }
    } catch {
      setResult('error');
    } finally {
      setSaving(false);
    }
  }

  const internalRoles = CANONICAL_ROLES.filter((r) => r.group === 'Internal');
  const externalRoles = CANONICAL_ROLES.filter((r) => r.group === 'External');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Roles</DialogTitle>
          <DialogDescription>
            Enter a Clerk user ID and select the roles to assign.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="user-id-input">Clerk User ID</Label>
            <Input
              id="user-id-input"
              placeholder="user_2abc..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Internal Roles</p>
            <div className="grid grid-cols-2 gap-2">
              {internalRoles.map((role) => (
                <label key={role.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedRoles.includes(role.key)}
                    onCheckedChange={() => toggleRole(role.key)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">External Roles</p>
            <div className="grid grid-cols-2 gap-2">
              {externalRoles.map((role) => (
                <label key={role.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedRoles.includes(role.key)}
                    onCheckedChange={() => toggleRole(role.key)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
          {result === 'success' && (
            <p className="text-sm text-green-600">Roles assigned successfully.</p>
          )}
          {result === 'error' && (
            <p className="text-sm text-destructive">Failed to assign roles. Check the user ID.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !userId.trim()}>
            {saving ? 'Saving...' : 'Save Roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [assignOpen, setAssignOpen] = useState(false);

  const roles = data?.data ?? [];

  return (
    <div className="flex h-full gap-6 p-6">
      <div className="w-72 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Roles</h1>
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            Assign
          </Button>
        </div>
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
            <CardHeader>
              <CardTitle className="text-base">{selectedRoleName}</CardTitle>
            </CardHeader>
            <CardContent>
              <RoleDetail roleId={selectedRoleId} roleName={selectedRoleName} />
            </CardContent>
          </Card>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select a role to view permissions
          </div>
        )}
      </div>

      <AssignRoleDialog open={assignOpen} onClose={() => setAssignOpen(false)} />
    </div>
  );
}
