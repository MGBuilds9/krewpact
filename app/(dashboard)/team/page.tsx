'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Mail } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeam';

export default function TeamPage() {
  const [search, setSearch] = useState('');
  const { data: members, isLoading } = useTeamMembers();

  const filteredMembers = (members ?? []).filter((m) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      m.first_name?.toLowerCase().includes(term) ||
      m.last_name?.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">{filteredMembers.length} team members</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No team members found</h3>
            <p className="text-muted-foreground">
              {members?.length === 0 ? 'No internal users in the system' : 'Try a different search term'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.first_name?.[0]}
                      {member.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {member.first_name} {member.last_name}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
