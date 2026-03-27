'use client';

import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';

import type { ProjectMember } from './types';

interface ProjectTeamStepProps {
  projectMembers: ProjectMember[];
  addProjectMember: () => void;
  removeProjectMember: (index: number) => void;
  updateProjectMember: (
    index: number,
    field: keyof ProjectMember,
    value: string | number | null,
  ) => void;
}

function MemberRow({
  member,
  users,
  onRemove,
  onUpdate,
}: {
  member: ProjectMember;
  users: ReturnType<typeof useUsers>['data'];
  onRemove: () => void;
  onUpdate: (field: keyof ProjectMember, value: string | number | null) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Team Member</Label>
            <Select value={member.user_id} onValueChange={(v) => onUpdate('user_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {users
                  ?.filter((u) => u.status === 'active')
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={member.member_role} onValueChange={(v) => onUpdate('member_role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Allocation %</Label>
            <Input
              type="number"
              placeholder="0"
              value={member.allocation_pct ?? ''}
              onChange={(e) =>
                onUpdate('allocation_pct', e.target.value ? parseFloat(e.target.value) : null)
              }
            />
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export function ProjectTeamStep({
  projectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
}: ProjectTeamStepProps) {
  const { data: users } = useUsers();
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium">Team Members</h4>
            <p className="text-sm text-muted-foreground">Add team members to this project</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addProjectMember}>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
        <div className="space-y-3">
          {projectMembers.map((member, idx) => (
            <MemberRow
              key={member.user_id || `member-${idx}`}
              member={member}
              users={users}
              onRemove={() => removeProjectMember(idx)}
              onUpdate={(field, value) => updateProjectMember(idx, field, value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
