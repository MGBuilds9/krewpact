'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Mail, UserMinus } from 'lucide-react';
import { useProjectMembers, useAddProjectMember, useRemoveProjectMember } from '@/hooks/useProjectMembers';
import { useUsers } from '@/hooks/useUsers';
import { toast } from 'sonner';

interface ProjectTeamTabProps {
  projectId: string;
}

export function ProjectTeamTab({ projectId }: ProjectTeamTabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('worker');

  const { data: teamMembers = [] } = useProjectMembers(projectId);
  const { data: allUsers } = useUsers();
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);

  const availableUsers = allUsers?.filter(
    (user) => !teamMembers.find((member) => member.user_id === user.id),
  );

  const handleAddMember = async () => {
    try {
      await addMember.mutateAsync({ user_id: selectedUserId, role: selectedRole });
      setIsOpen(false);
      setSelectedUserId('');
      toast.success('Team member added');
    } catch {
      toast.error('Error adding team member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      toast.success('Team member removed');
    } catch {
      toast.error('Error removing team member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Team Members</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Select User</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="worker">Worker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddMember}
                className="w-full"
                disabled={!selectedUserId}
              >
                Add to Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member) => (
          <Card key={member.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.user?.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.user?.first_name?.[0]}
                      {member.user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.user?.first_name} {member.user?.last_name}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {member.role}
                    </Badge>
                    {member.user?.email && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {member.user.email}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(member.id)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teamMembers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No team members yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Member
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
