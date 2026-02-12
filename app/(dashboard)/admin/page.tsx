'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Users, Briefcase, Settings } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeam';
import { useProjects } from '@/hooks/useProjects';
import { useDivision } from '@/contexts/DivisionContext';
import { useUserRBAC } from '@/hooks/useRBAC';

export default function AdminPage() {
  const { activeDivision } = useDivision();
  const { roles } = useUserRBAC();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: projects, isLoading: projectsLoading } = useProjects({ divisionId: activeDivision?.id });

  const isLoading = membersLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">System administration and user management</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" /> Team Members
            </div>
            <div className="text-2xl font-bold">{members?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Briefcase className="h-4 w-4" /> Active Projects
            </div>
            <div className="text-2xl font-bold">
              {projects?.filter((p) => p.status === 'active').length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Settings className="h-4 w-4" /> Division
            </div>
            <div className="text-2xl font-bold truncate">{activeDivision?.name ?? 'N/A'}</div>
          </CardContent>
        </Card>
      </div>

      {/* User Directory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!members?.length ? (
            <p className="text-muted-foreground text-center py-8">No users found</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.first_name?.[0]}
                        {member.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <Badge variant={member.is_active ? 'default' : 'secondary'}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
