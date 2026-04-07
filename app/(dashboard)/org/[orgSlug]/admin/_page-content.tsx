'use client';

import { Briefcase, Settings, Shield, Users } from 'lucide-react';

import { SystemHealthCard } from '@/components/Admin/SystemHealthCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDivisionFilter, useDivision } from '@/contexts/DivisionContext';
import { useProjects } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeam';

interface Member {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  status: string;
}

function SummaryCards({
  memberCount,
  activeProjectCount,
  divisionName,
}: {
  memberCount: number;
  activeProjectCount: number;
  divisionName: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" /> Team Members
          </div>
          <div className="text-2xl font-bold">{memberCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Briefcase className="h-4 w-4" /> Active Projects
          </div>
          <div className="text-2xl font-bold">{activeProjectCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Settings className="h-4 w-4" /> Division
          </div>
          <div className="text-2xl font-bold truncate">{divisionName}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg border hover:bg-muted/50 transition-colors">
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
      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
        {member.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  );
}

function UserDirectoryCard({ members }: { members: Member[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Directory
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!members.length ? (
          <p className="text-muted-foreground text-center py-8">No users found</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { activeDivision } = useDivision();
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: projects, isLoading: projectsLoading } = useProjects({
    divisionId: getDivisionFilter(activeDivision),
  });
  const isLoading = membersLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeProjectCount = projects?.filter((p) => p.status === 'active').length ?? 0;

  return (
    <>
      <title>Admin — KrewPact</title>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
            <p className="text-muted-foreground">System administration and user management</p>
          </div>
        </div>
        <SummaryCards
          memberCount={members?.length ?? 0}
          activeProjectCount={activeProjectCount}
          divisionName={activeDivision?.name ?? 'N/A'}
        />
        <UserDirectoryCard members={(members ?? []) as Member[]} />
        <SystemHealthCard />
      </div>
    </>
  );
}
