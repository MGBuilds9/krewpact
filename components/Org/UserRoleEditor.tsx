'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUpdateUserRoles, useUserRoles } from '@/hooks/useUserRoles';

const INTERNAL_ROLES: { key: string; label: string }[] = [
  { key: 'platform_admin', label: 'Platform Admin' },
  { key: 'executive', label: 'Executive' },
  { key: 'operations_manager', label: 'Operations Manager' },
  { key: 'project_manager', label: 'Project Manager' },
  { key: 'project_coordinator', label: 'Project Coordinator' },
  { key: 'estimator', label: 'Estimator' },
  { key: 'field_supervisor', label: 'Field Supervisor' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'payroll_admin', label: 'Payroll Admin' },
];

const EXTERNAL_ROLES: { key: string; label: string }[] = [
  { key: 'client_owner', label: 'Client Owner' },
  { key: 'client_delegate', label: 'Client Delegate' },
  { key: 'trade_partner_admin', label: 'Trade Partner Admin' },
  { key: 'trade_partner_user', label: 'Trade Partner User' },
];

interface UserRoleEditorProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRoleEditor({ userId, userName, open, onOpenChange }: UserRoleEditorProps) {
  const { data, isLoading } = useUserRoles(open ? userId : null);
  const updateRoles = useUpdateUserRoles();
  const fetchedRoleKeys = useMemo(
    () => data?.roles?.map((r) => r.role_key) ?? [],
    [data?.roles],
  );
  const [selectedRoles, setSelectedRoles] = useState<string[] | null>(null);

  // Use fetched data as baseline, local edits override
  const activeRoles = selectedRoles ?? fetchedRoleKeys;

  function toggleRole(roleKey: string) {
    const current = activeRoles;
    setSelectedRoles(
      current.includes(roleKey) ? current.filter((r) => r !== roleKey) : [...current, roleKey],
    );
  }

  async function handleSave() {
    try {
      await updateRoles.mutateAsync({ userId, roleKeys: activeRoles });
      toast.success('Roles updated successfully');
      setSelectedRoles(null);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update roles');
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) setSelectedRoles(null);
    onOpenChange(isOpen);
  }

  function renderRoleGroup(roles: { key: string; label: string }[]) {
    return roles.map(({ key, label }) => (
      <div key={key} className="flex items-center gap-3">
        <Checkbox
          id={`role-${key}`}
          checked={activeRoles.includes(key)}
          onCheckedChange={() => toggleRole(key)}
        />
        <Label htmlFor={`role-${key}`} className="cursor-pointer font-normal">
          {label}
        </Label>
      </div>
    ));
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Roles — {userName}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading roles…
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Internal Roles</p>
              {renderRoleGroup(INTERNAL_ROLES)}
            </div>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">External Roles</p>
              {renderRoleGroup(EXTERNAL_ROLES)}
            </div>
          </div>
        )}

        <div className="mt-auto flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateRoles.isPending || isLoading}>
            {updateRoles.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Roles
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
